import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Types
interface ProfileUpdateRequest {
  address: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  signature: string;
  nonce: string;
}

interface ProfileData {
  username: string;
  avatar_url?: string;
  bio?: string;
  profile_hash: string;
  profile_cid: string;
}

// Initialize Aptos client
// const aptosClient = new AptosClient(process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, username, avatar_url, bio, signature, nonce }: ProfileUpdateRequest = req.body;

    // Validate required fields
    if (!address || !username || !signature || !nonce) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate Aptos address format
    if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Aptos address format' });
    }

    // Validate username (alphanumeric + underscore, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    // Validate avatar URL if provided
    if (avatar_url && !isValidUrl(avatar_url)) {
      return res.status(400).json({ error: 'Invalid avatar URL' });
    }

    // Validate bio length
    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Bio too long (max 500 characters)' });
    }

    // TODO: Verify nonce hasn't expired (check against stored nonce)

    // Verify signature
    // const isValidSignature = await verifySignature(address, signature, nonce);
    // if (!isValidSignature) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Create profile data
    const profileData: ProfileData = {
      username,
      avatar_url: avatar_url || '',
      bio: bio || '',
      profile_hash: '', // Will be calculated
      profile_cid: ''   // Will be generated
    };

    // Calculate profile hash
    const profileJson = JSON.stringify(profileData, Object.keys(profileData).sort());
    const profileHash = crypto.createHash('sha256').update(profileJson).digest('hex');

    // TODO: Upload to IPFS and get CID
    // For now, we'll use a placeholder CID
    const profileCid = `ipfs://${profileHash.substring(0, 16)}`;

    // Update profile hash in data
    profileData.profile_hash = profileHash;
    profileData.profile_cid = profileCid;

    // TODO: Store in database
    // await storeProfileInDatabase(address, profileData);

    // TODO: Call Move contract to emit event
    // await emitProfileUpdateEvent(address, profileHash, profileCid);

    // Return success response
    res.status(200).json({
      success: true,
      profile: {
        username,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        profile_hash: profileHash,
        profile_cid: profileCid
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to verify signature
// async function verifySignature(address: string, signature: string, nonce: string): Promise<boolean> {
//   try {
//     // Reconstruct the message that was signed
//     // const message = `Sign this message to update your profile. Nonce: ${nonce}`;
//     
//     // Convert signature from base64 to bytes
//     // const signatureBytes = Buffer.from(signature, 'base64');
//     
//     // Get account info from Aptos
//     // const accountInfo = await aptosClient.getAccount(address);
//     // const publicKey = accountInfo.authentication_key;
//     
//     // TODO: Implement proper signature verification using ed25519
//     // For now, we'll return true as a placeholder
//     // In production, use a proper ed25519 library to verify the signature
//     
//     return true;
//   } catch (error) {
//     console.error('Signature verification error:', error);
//     return false;
//   }
// }

// Helper function to validate URL
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' || urlObj.protocol === 'ipfs:';
  } catch {
    return false;
  }
}
