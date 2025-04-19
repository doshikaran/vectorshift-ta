// slack.js

// TODO


import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export const HubspotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadedData, setLoadedData] = useState(null);

  const handleConnectClick = async () => {
    try {
      setIsConnecting(true);
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      const response = await axios.post(`http://localhost:8000/integrations/hubspot/authorize`, formData);
      const authURL = response?.data;
      const newWindow = window.open(authURL, 'HubSpot Authorization', 'width=600, height=600');
      const pollTimer = window.setInterval(() => {
        if (newWindow?.closed !== false) {
          window.clearInterval(pollTimer);
          handleWindowClosed();
        }
      }, 200);
    } catch (e) {
      setIsConnecting(false);
      alert(e?.response?.data?.detail);
    }
  };

  const handleWindowClosed = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      const response = await axios.post(`http://localhost:8000/integrations/hubspot/credentials`, formData);
      const credentials = response.data;
      if (credentials) {
        setIsConnecting(false);
        setIsConnected(true);
        setIntegrationParams(prev => ({ ...prev, credentials: credentials, type: 'Hubspot' }));
      }
    } catch (e) {
      setIsConnecting(false);
      alert(e?.response?.data?.detail);
    }
  };

  const loadHubspotData = async () => {
    try {
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrationParams?.credentials));
      const response = await axios.post(`http://localhost:8000/integrations/hubspot/get_hubspot_items`, formData);
      const data = response.data;
      setLoadedData(data);
    } catch (e) {
      alert(e?.response?.data?.detail || e.message);
    }
  };

  const exportToCSV = () => {
    if (!loadedData) return alert("Please load data first.");
    const csvRows = [
      ['ID', 'Name', 'Type', 'Created At', 'Updated At'],
      ...loadedData.map(item => [item.id, item.name, item.type, item.creation_time, item.last_modified_time])
    ];
    const blob = new Blob([csvRows.map(e => e.join(",")).join("\n")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hubspot_data.csv';
    a.click();
  };

  const clearData = () => {
    if (!loadedData) return alert("Please load data first.");
    setLoadedData(null);
  };

  useEffect(() => {
    setIsConnected(integrationParams?.credentials ? true : false);
  }, []);

  const contacts = loadedData?.filter(item => item.type === 'Contact') || [];
  const companies = loadedData?.filter(item => item.type === 'Company') || [];

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        HubSpot Dashboard
      </Typography>
      <Box display="flex" gap={2} alignItems="center" mb={3}>
        <Button
          variant='contained'
          onClick={isConnected ? () => {} : handleConnectClick}
          color={isConnected ? 'success' : 'primary'}
          disabled={isConnecting}
        >
          {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
        </Button>
        {isConnected && (
          <>
            <Button onClick={loadHubspotData} variant='outlined'>Load Data</Button>
            <Tooltip title="Export as CSV">
              <Button onClick={exportToCSV} variant='outlined' color='secondary' startIcon={<DownloadIcon />}>
                Export CSV
              </Button>
            </Tooltip>
            <Tooltip title="Clear Loaded Data">
              <Button onClick={clearData} variant='outlined' color='warning' startIcon={<DeleteIcon />}>
                Clear
              </Button>
            </Tooltip>
          </>
        )}
      </Box>

      {contacts.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            <ContactPhoneIcon sx={{ mr: 1 }} />HubSpot Contacts
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {contacts.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{item.name}</Typography>
                    <Typography variant="body2">ID: {item.id}</Typography>
                    <Typography variant="body2">Type: {item.type}</Typography>
                    <Typography variant="body2">Created: {item.creation_time}</Typography>
                    <Typography variant="body2">Updated: {item.last_modified_time}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {companies.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            <BusinessIcon sx={{ mr: 1 }} />HubSpot Companies
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            {companies.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{item.name}</Typography>
                    <Typography variant="body2">ID: {item.id}</Typography>
                    <Typography variant="body2">Type: {item.type}</Typography>
                    <Typography variant="body2">Created: {item.creation_time}</Typography>
                    <Typography variant="body2">Updated: {item.last_modified_time}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};