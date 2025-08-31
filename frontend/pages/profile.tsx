import React, { useState, useEffect, useCallback } from 'react';

import {
  Container,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import MainLayout from '../src/layouts/MainLayout';
import ProfileCard from '../src/components/profile/ProfileCard';
import ProfileEditForm from '../src/components/profile/ProfileEditForm';

interface ProfileData {
  username: string;
  avatar_url: string;
  bio: string;
  profile_hash: string;
  profile_cid: string;
  updated_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

const ProfilePage: React.FC = () => {
  const { account, connected } = useWallet();
  
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    if (!account?.address) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/profile/${account.address}`);
      const data = await response.json();

      if (response.ok) {
        setProfileData(data.profile);
      } else if (response.status === 404) {
        // Profile doesn't exist yet
        setProfileData(null);
      } else {
        throw new Error(data.error || 'Failed to fetch profile');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    if (connected && account?.address) {
      fetchProfile();
    }
  }, [connected, account?.address, fetchProfile]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleProfileSave = (profile: { username: string; avatarUrl: string; bio: string }) => {
    // Convert the form data to ProfileData format
    const updatedProfile: ProfileData = {
      username: profile.username,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      profile_hash: profileData?.profile_hash || '',
      profile_cid: profileData?.profile_cid || '',
      updated_at: new Date().toISOString()
    };
    setProfileData(updatedProfile);
    setIsEditing(false);
    setTabValue(0); // Switch to view tab
  };

  const handleCreateProfile = () => {
    setIsEditing(true);
    setTabValue(1); // Switch to edit tab
  };

  if (!connected) {
    return (
      <MainLayout>
        <Container maxWidth="md">
          <Box textAlign="center" py={8}>
            <Typography variant="h4" gutterBottom>
              Connect Your Wallet
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Please connect your Aptos wallet to view and manage your profile.
            </Typography>
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Box py={4}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Profile Management
          </Typography>
          
          <Paper sx={{ mt: 4 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="profile tabs"
              centered
            >
              <Tab label="View Profile" {...a11yProps(0)} />
              <Tab label="Edit Profile" {...a11yProps(1)} />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {isLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : profileData ? (
                <Box>
                  <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEditClick}
                    >
                      Edit Profile
                    </Button>
                  </Box>
                  
                  <ProfileCard
                    address={account?.address?.toString() || ''}
                    username={profileData.username}
                    avatarUrl={profileData.avatar_url}
                    bio={profileData.bio}
                    profileHash={profileData.profile_hash}
                    profileCid={profileData.profile_cid}
                    updatedAt={profileData.updated_at}
                    showDetails={true}
                  />
                </Box>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" gutterBottom>
                    No Profile Found
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    You haven&apos;t created a profile yet. Create one to get started!
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleCreateProfile}
                  >
                    Create Profile
                  </Button>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {isEditing ? (
                <ProfileEditForm
                  initialData={profileData || {}}
                  onSave={handleProfileSave}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="h6" gutterBottom>
                    Edit Profile
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Click the edit button in the View Profile tab to make changes.
                  </Typography>
                </Box>
              )}
            </TabPanel>
          </Paper>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default ProfilePage;
