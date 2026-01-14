/**
 * Subject Card
 * Premium card for displaying subject information with progress and guidance
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';
import StatusChip from './StatusChip';

interface SubjectCardProps {
  courseName: string;
  courseCode: string;
  attendancePercentage: number;
  presentCount: number;
  totalClasses: number;
  onPress?: () => void;
  style?: ViewStyle;
  guidance?: string;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  courseName,
  courseCode,
  attendancePercentage,
  presentCount,
  totalClasses,
  onPress,
  style,
  guidance,
}) => {
  const {colors} = useTheme();

  const getStatus = (): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (attendancePercentage >= 75) return 'on-track';
    if (attendancePercentage >= 60) return 'catching-up';
    return 'needs-attention';
  };

  const getGuidanceMessage = () => {
    if (guidance) return guidance;
    if (attendancePercentage >= 75) return 'Keep up the great attendance!';
    if (attendancePercentage >= 60) {
      const classesNeeded = Math.ceil((0.75 * totalClasses - presentCount) / (1 - 0.75));
      return `Attend next ${classesNeeded} classes to improve`;
    }
    const classesNeeded = Math.ceil((0.75 * totalClasses - presentCount) / (1 - 0.75));
    return `Attend next ${classesNeeded} classes to get back on track`;
  };

  const status = getStatus();

  const CardContent = (
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
        <View style={styles.headerLeft}>
          <Text style={[styles.courseCode, {color: colors.textMuted}]}>
            {courseCode}
          </Text>
          <Text style={[styles.courseName, {color: colors.textPrimary}]} numberOfLines={2}>
            {courseName}
          </Text>
        </View>
        <StatusChip status={status} size="sm" />
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.percentage, {color: colors.textPrimary}]}>
            {Math.round(attendancePercentage)}%
          </Text>
          <Text style={[styles.count, {color: colors.textMuted}]}>
            {presentCount} / {totalClasses}
          </Text>
        </View>
        <View style={[styles.progressBar, {backgroundColor: colors.borderLight}]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${attendancePercentage}%`,
                backgroundColor:
                  status === 'on-track'
                    ? colors.success
                    : status === 'catching-up'
                    ? colors.warning
                    : '#D32F2F',
              },
            ]}
          />
        </View>
      </View>

      {guidance && (
        <View style={styles.guidance}>
          <Text style={[styles.guidanceText, {color: colors.textSecondary}]}>
            {getGuidanceMessage()}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{CardContent}</TouchableOpacity>;
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.base,
  },
  courseCode: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  courseName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  percentage: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  count: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  progressBar: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  guidance: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  guidanceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
});

export default SubjectCard;
