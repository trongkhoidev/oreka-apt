import React from 'react';
import { Box, Card, CardContent, Typography, Avatar, Chip, Link } from '@mui/material';
import { styled } from '@mui/material/styles';

interface ProfileCardProps {
  address: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  profileHash?: string;
  profileCid?: string;
  updatedAt?: string;
  showDetails?: boolean;
}

const StyledCard = styled(Card)(() => ({
  minWidth: 275,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
}));

const StyledAvatar = styled(Avatar)(() => ({
  width: 80,
  height: 80,
  border: '4px solid white',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
}));

const ProfileCard: React.FC<ProfileCardProps> = ({
  address,
  username,
  avatarUrl,
  bio,
  profileHash,
  profileCid,
  updatedAt,
  showDetails = false,
}) => {
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <StyledCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <StyledAvatar
            src={avatarUrl || '/images/default-avatar.png'}
            alt={username || 'User'}
            sx={{ mr: 2 }}
          >
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </StyledAvatar>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              {username || 'Anonymous User'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {formatAddress(address)}
            </Typography>
          </Box>
        </Box>

        {bio && (
          <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
            {bio}
          </Typography>
        )}

        {showDetails && profileHash && (
          <Box mt={2}>
            <Typography variant="caption" display="block" sx={{ opacity: 0.7, mb: 1 }}>
              Profile Hash:
            </Typography>
            <Chip
              label={formatAddress(profileHash)}
              size="small"
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '0.7rem'
              }}
            />
          </Box>
        )}

        {showDetails && profileCid && (
          <Box mt={2}>
            <Typography variant="caption" display="block" sx={{ opacity: 0.7, mb: 1 }}>
              Profile Data:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Link
                href={`https://ipfs.io/ipfs/${profileCid.replace('ipfs://', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textDecoration: 'none' }}
              >
                <Chip
                  label={`📁 IPFS: ${profileCid.substring(0, 20)}...`}
                  size="small"
                  sx={{ 
                    backgroundColor: '#4F8CFF', 
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#3B7CD9',
                    }
                  }}
                />
              </Link>
              <Chip
                label={`🔗 ${profileCid.replace('ipfs://', '').substring(0, 12)}...`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }
                }}
                onClick={() => navigator.clipboard.writeText(profileCid)}
              />
            </Box>
          </Box>
        )}

        {updatedAt && (
          <Box mt={2}>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Last updated: {formatDate(updatedAt)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default ProfileCard;
