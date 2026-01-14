/**
 * Hero Insight Card
 * Premium card component for displaying key insights with calm, supportive messaging
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

type InsightStatus = 'on-track' | 'catching-up' | 'needs-attention';

interface HeroInsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: InsightStatus;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const HeroInsightCard: React.FC<HeroInsightCardProps> = ({
  title,
  value,
  subtitle,
  status = 'on-track',
  onPress,
  style,
}) => {
  const {colors} = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'on-track':
        return {
          bgColor: colors.successLight || '#E8F5E9',
          textColor: colors.success || '#27ae60',
          message: "You're doing great!",
        };
      case 'catching-up':
        return {
          bgColor: colors.warningLight || '#FFF8E1',
          textColor: colors.warning || '#F9A825',
          message: 'You can recover',
        };
      case 'needs-attention':
        return {
          bgColor: '#FEF5F5',
          textColor: '#D32F2F',
          message: 'Let\'s work on this together',
        };
      default:
        return {
          bgColor: colors.infoLight || '#E3F2FD',
          textColor: colors.info || '#1976D2',
          message: '',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
        style,
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.textSecondary}]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, {color: colors.textMuted}]}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.value, {color: colors.textPrimary}]}>{value}</Text>
        {statusConfig.message && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusConfig.bgColor,
              },
            ]}>
            <Text style={[styles.statusText, {color: statusConfig.textColor}]}>
              {statusConfig.message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  header: {
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
  },
  content: {
    alignItems: 'flex-start',
  },
  value: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize['4xl'] * 1.1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default HeroInsightCard;
