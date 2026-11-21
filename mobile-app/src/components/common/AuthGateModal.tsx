import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal, Button, Badge } from '@/components/ui';
import { useTheme } from '@/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export interface AuthGateModalProps {
  visible: boolean;
  onClose: () => void;
  actionTitle?: string; // e.g. "Chat with Seller", "Call Seller", "Post an Ad"
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  visible,
  onClose,
  actionTitle = 'Access Verified Feature',
}) => {
  const { colors } = useTheme();
  const router = useRouter();

  const handleSignIn = () => {
    onClose();
    router.push('/(auth)/login' as any);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Authentication Required">
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="lock-closed" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {actionTitle} Requires Verification
        </Text>

        <Badge
          variant="verified"
          label="NID-Verified Citizen Guard"
          style={{ marginVertical: 8 }}
        />

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          To maintain a scam-free C2C ecosystem in Bangladesh, only verified citizens can contact sellers, make offers, or post listings.
        </Text>

        <Button
          title="Sign In / Register with Mobile"
          variant="primary"
          size="lg"
          onPress={handleSignIn}
          style={{ marginTop: 20 }}
          fullWidth
        />

        <Button
          title="Cancel"
          variant="ghost"
          onPress={onClose}
          style={{ marginTop: 8 }}
          fullWidth
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
});
