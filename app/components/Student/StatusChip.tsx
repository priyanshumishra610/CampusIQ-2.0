/**
 * Status Chip
 * Premium status indicator with calm, supportive messaging
 */

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius} from '../../theme/designTokens';

type StatusType = 'on-track' | 'catching-up' | 'needs-attention' | 'excellent';

interface StatusChipProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const StatusChip: React.FC<StatusChipProps> = ({status, size = 'md', style}) => {
  const {colors} = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'on-track':
        return {
          label: 'On Track',
          bgColor: '#E8F5E9',
          textColor: '#2E7D32',
        };
      case 'catching-up':
        return {
          label: 'Catching Up',
          bgColor: '#FFF8E1',
          textColor: '#F57C00',
        };
      case 'needs-attention':
        return {
          label: 'Needs Attention',
          bgColor: '#FEF5F5',
          textColor: '#C62828',
        };
      case 'excellent':
        return {
          label: 'Excellent',
          bgColor: '#E3F2FD',
          textColor: '#1565C0',
        };
      default:
        return {
          label: 'On Track',
          bgColor: '#E8F5E9',
          textColor: '#2E7D32',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = {
    sm: {padding: Spacing.xs, fontSize: Typography.fontSize.xs},
    md: {padding: Spacing.sm, fontSize: Typography.fontSize.sm},
    lg: {padding: Spacing.md, fontSize: Typography.fontSize.base},
  };

  const currentSize = sizeConfig[size];

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: statusConfig.bgColor,
          paddingHorizontal: currentSize.padding,
          paddingVertical: currentSize.padding * 0.75,
        },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          {
            color: statusConfig.textColor,
            fontSize: currentSize.fontSize,
          },
        ]}>
        {statusConfig.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
});

export default StatusChip;
