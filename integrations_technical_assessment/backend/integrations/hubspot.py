# slack.py

import json
import secrets
import asyncio
import base64
import hashlib
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import httpx
import requests
from datetime import datetime
from urllib.parse import quote_plus
from integrations.integration_item import IntegrationItem
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

CLIENT_ID = '0c91cd7d-a892-472d-9787-3aa120e2ef6a'
CLIENT_SECRET = 'b75354d3-9e19-4d53-956f-379d2100027a'
REDIRECT_URI = "https://hydrogen-ham-katie-election.trycloudflare.com/integrations/hubspot/oauth2callback"

AUTHORIZATION_URL = "https://app.hubspot.com/oauth/authorize"
TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"
SCOPE = "oauth crm.objects.contacts.read crm.objects.companies.read"

async def authorize_hubspot(user_id, org_id):
    state_data = {
        'state': secrets.token_urlsafe(32),
        'user_id': user_id,
        'org_id': org_id
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')

    code_verifier = secrets.token_urlsafe(32)
    m = hashlib.sha256()
    m.update(code_verifier.encode('utf-8'))
    code_challenge = base64.urlsafe_b64encode(m.digest()).decode('utf-8').replace('=', '')

    auth_url = f'{AUTHORIZATION_URL}?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope={quote_plus(SCOPE)}&state={encoded_state}&code_challenge={code_challenge}&code_challenge_method=S256&response_type=code'
    await asyncio.gather(
        add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=1200),
        add_key_value_redis(f'hubspot_verifier:{org_id}:{user_id}', code_verifier, expire=1200),
    )

    return auth_url

async def oauth2callback_hubspot(request: Request):
    if request.query_params.get('error'):
        raise HTTPException(status_code=400, detail=request.query_params.get('error_description'))

    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))

    original_state = state_data.get('state')
    user_id = state_data.get('user_id')
    org_id = state_data.get('org_id')

    saved_state, code_verifier = await asyncio.gather(
        get_value_redis(f'hubspot_state:{org_id}:{user_id}'),
        get_value_redis(f'hubspot_verifier:{org_id}:{user_id}')
    )

    if not saved_state or original_state != json.loads(saved_state).get('state'):
        raise HTTPException(status_code=400, detail='State does not match.')

    async with httpx.AsyncClient() as client:
        token_response, _, _ = await asyncio.gather(
            client.post(
                TOKEN_URL,
                data={
                    'grant_type': 'authorization_code',
                    'client_id': CLIENT_ID,
                    'client_secret': CLIENT_SECRET,
                    'redirect_uri': REDIRECT_URI,
                    'code': code,
                    'code_verifier': code_verifier.decode('utf-8') if isinstance(code_verifier, bytes) else code_verifier
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            ),
            delete_key_redis(f'hubspot_state:{org_id}:{user_id}'),
            delete_key_redis(f'hubspot_verifier:{org_id}:{user_id}'),
        )

    await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(token_response.json()), expire=1200 )

    return HTMLResponse(content="""
    <html><script>window.close();</script></html>
    """)

async def get_hubspot_credentials(user_id, org_id):
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=400, detail='No credentials found.')
    credentials = json.loads(credentials)
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')
    return credentials

async def create_integration_item_metadata_object(response_json, item_type) -> IntegrationItem:
    properties = response_json.get("properties", {})

    return IntegrationItem(
        id=response_json.get("id"),
        name=properties.get("firstname") or properties.get("name") or "Unknown",
        type=item_type,
        creation_time=datetime.strptime(response_json.get("createdAt"), "%Y-%m-%dT%H:%M:%S.%fZ") if response_json.get("createdAt") else None,
        last_modified_time=datetime.strptime(response_json.get("updatedAt"), "%Y-%m-%dT%H:%M:%S.%fZ") if response_json.get("updatedAt") else None,
        parent_id=None,
        parent_path_or_name=None,
    )

async def get_items_hubspot(credentials):
    credentials = json.loads(credentials)
    access_token = credentials.get("access_token")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    items = []

    for endpoint, item_type in [
        ("https://api.hubapi.com/crm/v3/objects/contacts", "Contact"),
        ("https://api.hubapi.com/crm/v3/objects/companies", "Company")
    ]:
        response = requests.get(endpoint, headers=headers)

        if response.status_code == 200:
            data = response.json().get("results", [])
            for item in data:
                integration_item = await create_integration_item_metadata_object(item, item_type)
                items.append(integration_item)
        else:
            print(f"Failed to fetch {item_type}: {response.status_code}, {response.text}")

    return items
