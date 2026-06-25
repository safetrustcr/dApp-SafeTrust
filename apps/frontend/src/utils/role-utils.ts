type UserRole = 'admin' | 'hotel' | 'guest' | null;

export function getUserRole(): UserRole {
  const storedAddress = localStorage.getItem('address-wallet');
  
  if (!storedAddress) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedAddress);
    const address = typeof parsed === 'string' ? parsed : parsed?.address;

    if (!address || typeof address !== 'string') {
      return null;
    }

    if (address.startsWith('0xadmin') || address.includes('admin')) {
      return 'admin';
    } else if (address.startsWith('0xhotel') || address.includes('hotel')) {
      return 'hotel';
    } else {
      return 'guest';
    }
  } catch (error) {
    console.error('Error parsing stored wallet data:', error);
    return null;
  }
}