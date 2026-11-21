import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Avatar, Badge, Card, Button } from '@/components/ui';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      title: 'My Saved Favorites',
      icon: 'heart-outline' as const,
      route: '/(tabs)/profile/favorites',
    },
    {
      title: 'Deals & Bilateral Reviews',
      icon: 'receipt-outline' as const,
      route: '/(tabs)/profile/deals',
    },
    {
      title: 'Identity Verification (E-KYC)',
      icon: 'shield-checkmark-outline' as const,
      route: '/(auth)/kyc',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: spacing.lg }}>
        {/* User Card */}
        <Card style={styles.profileCard}>
          <Avatar
            name={user?.displayName || 'Citizen'}
            url={user?.avatarUrl}
            isVerified={user?.isNidVerified}
            size="lg"
          />
          <View style={styles.profileMeta}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {user?.displayName || 'Farhana R.'}
            </Text>
            <Text style={[styles.phone, { color: colors.textSecondary }]}>
              {user?.phone || '+880 1712-345678'}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Badge
                variant="verified"
                label={user?.isNidVerified ? 'NID Verified' : 'Unverified Citizen'}
              />
            </View>
          </View>
        </Card>

        {/* Menu Navigation */}
        <View style={{ marginTop: 24 }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={async () => {
            await logout();
            router.replace('/(public)' as any);
          }}
          style={{ marginTop: 32 }}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMeta: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  phone: {
    fontSize: 13,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
});
