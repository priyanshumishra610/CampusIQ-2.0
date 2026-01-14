/**
 * Profile & Identity - Premium Redesign
 * Clean, calm profile view with identity information
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

const ProfileScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);

  const profileSections = [
    {
      title: 'Academic Information',
      items: [
        {label: 'Enrollment Number', value: user?.enrollmentNumber || '—'},
        {label: 'Student ID', value: user?.studentId || '—'},
        {label: 'Department', value: user?.department || '—'},
        {label: 'Campus', value: user?.campusName || '—'},
      ],
    },
    {
      title: 'Contact Information',
      items: [
        {label: 'Email', value: user?.email || '—'},
        {label: 'Phone', value: user?.phoneNumber || '—'},
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Profile
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Your identity and information
        </Text>
      </View>

      {/* Profile Card */}
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}>
        <View style={styles.profileHeader}>
          {user?.profileImageUrl ? (
            <Image
              source={{uri: user.profileImageUrl}}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, {backgroundColor: colors.primaryAccentLight}]}>
              <Text style={[styles.avatarText, {color: colors.primary}]}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.name, {color: colors.textPrimary}]}>
              {user?.name || 'Student'}
            </Text>
            <Text style={[styles.role, {color: colors.textMuted}]}>
              {user?.role || 'STUDENT'}
            </Text>
          </View>
        </View>
      </View>

      {/* Information Sections */}
      {profileSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
            {section.title}
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}>
            {section.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                style={[
                  styles.infoRow,
                  itemIndex < section.items.length - 1 && {
                    borderBottomColor: colors.borderLight,
                    borderBottomWidth: 1,
                  },
                ]}>
                <Text style={[styles.infoLabel, {color: colors.textMuted}]}>
                  {item.label}
                </Text>
                <Text style={[styles.infoValue, {color: colors.textPrimary}]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Quick Access */}
      <View style={styles.quickAccessSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Quick Access
        </Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={[
              styles.quickAccessCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Library')}
            activeOpacity={0.7}>
            <Text style={[styles.quickAccessIcon]}>📚</Text>
            <Text style={[styles.quickAccessLabel, {color: colors.textPrimary}]}>
              Library
            </Text>
            <Text style={[styles.quickAccessSubtext, {color: colors.textMuted}]}>
              Your books
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickAccessCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Payments')}
            activeOpacity={0.7}>
            <Text style={[styles.quickAccessIcon]}>💳</Text>
            <Text style={[styles.quickAccessLabel, {color: colors.textPrimary}]}>
              Payments
            </Text>
            <Text style={[styles.quickAccessSubtext, {color: colors.textMuted}]}>
              Fees & dues
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}>
          <Text style={[styles.actionText, {color: colors.textPrimary}]}>
            Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
          onPress={() => navigation.navigate('Help')}
          activeOpacity={0.7}>
          <Text style={[styles.actionText, {color: colors.textPrimary}]}>
            Help & Support
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    padding: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
  },
  profileCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: Spacing.base,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  role: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.base,
  },
  sectionCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  infoRow: {
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
    textAlign: 'right',
  },
  quickAccessSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  quickAccessCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickAccessIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  quickAccessLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  quickAccessSubtext: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
  },
  actionsSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    gap: Spacing.base,
  },
  actionButton: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...Shadows.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ProfileScreen;
