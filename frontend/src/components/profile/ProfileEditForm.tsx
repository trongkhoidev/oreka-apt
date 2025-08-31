import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { PhotoCamera, Save, Cancel } from '@mui/icons-material';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface ProfileEditFormProps {
  onSave?: (profile: { username: string; avatarUrl: string; bio: string }) => void;
  onCancel?: () => void;
  initialData?: {
    username?: string;
    avatarUrl?: string;
    bio?: string;
  };
}

const StyledCard = styled(Card)(() => ({
  maxWidth: 600,
  margin: '0 auto',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
}));

const StyledAvatar = styled(Avatar)(() => ({
  width: 100,
  height: 100,
  border: '4px solid #e0e0e0',
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#1976d2',
  },
}));

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  onSave,
  onCancel,
  initialData = {},
}) => {
  const { account, signMessage } = useWallet();
  
  const [formData, setFormData] = useState({
    username: initialData.username || '',
    avatarUrl: initialData.avatarUrl || '',
    bio: initialData.bio || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [nonce, setNonce] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (account?.address) {
      fetchNonce();
    }
  }, [account?.address]);

  const fetchNonce = useCallback(async () => {
    try {
      const response = await fetch(`/api/auth/nonce?address=${account?.address}`);
      const data = await response.json();
      setNonce(data.nonce);
      setMessage(data.message);
    } catch (error) {
      console.error('Failed to fetch nonce:', error);
    }
  }, [account?.address]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters, alphanumeric + underscore only';
    }

    if (formData.avatarUrl && !isValidUrl(formData.avatarUrl)) {
      newErrors.avatarUrl = 'Please enter a valid URL';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!account?.address || !signMessage) {
      setErrors({ submit: 'Wallet not connected or signature not supported' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Sign the message
      const signature = await signMessage({ message, nonce });
      
      // Submit profile update
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.address,
          username: formData.username,
          avatar_url: formData.avatarUrl,
          bio: formData.bio,
          signature: signature,
          nonce: nonce,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Success
      if (onSave) {
        onSave(result.profile);
      }
      
      // Refresh nonce for next update
      fetchNonce();
      
    } catch (error: unknown) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    // TODO: Implement image upload to IPFS
    const url = prompt('Enter avatar URL (IPFS or HTTP):');
    if (url && isValidUrl(url)) {
      setFormData(prev => ({ ...prev, avatarUrl: url }));
    }
  };

  if (!account?.address) {
    return (
      <Alert severity="warning">
        Please connect your wallet to edit your profile.
      </Alert>
    );
  }

  return (
    <StyledCard>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Edit Profile
        </Typography>

        <Box display="flex" justifyContent="center" mb={3}>
          <Box position="relative">
            <StyledAvatar
              src={formData.avatarUrl || '/images/default-avatar.png'}
              onClick={handleAvatarClick}
            >
              {formData.username ? formData.username.charAt(0).toUpperCase() : 'U'}
            </StyledAvatar>
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': { backgroundColor: 'primary.dark' },
              }}
              onClick={handleAvatarClick}
            >
              <PhotoCamera fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            error={!!errors.username}
            helperText={errors.username || '3-20 characters, alphanumeric + underscore only'}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Avatar URL"
            value={formData.avatarUrl}
            onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
            error={!!errors.avatarUrl}
            helperText={errors.avatarUrl || 'IPFS or HTTP URL (optional)'}
            margin="normal"
            placeholder="ipfs://... or https://..."
          />

          <TextField
            fullWidth
            label="Bio"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            error={!!errors.bio}
            helperText={errors.bio || `${formData.bio.length}/500 characters`}
            margin="normal"
            multiline
            rows={3}
            placeholder="Tell us about yourself..."
          />

          {errors.submit && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.submit}
            </Alert>
          )}

          <Box display="flex" gap={2} mt={3}>
            <Button
              type="submit"
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={20} /> : <Save />}
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? 'Updating...' : 'Save Profile'}
            </Button>
            
            {onCancel && (
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={onCancel}
                disabled={isLoading}
                fullWidth
              >
                Cancel
              </Button>
            )}
          </Box>
        </form>

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Your profile will be signed with your wallet and stored on IPFS for transparency.
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default ProfileEditForm;
