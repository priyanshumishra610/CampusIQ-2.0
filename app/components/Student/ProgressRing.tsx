/**
 * Progress Ring
 * Animated circular progress indicator for attendance and metrics
 * Simplified visual representation
 */

import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing} from '../../theme/designTokens';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  status?: 'on-track' | 'catching-up' | 'needs-attention';
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 120,
  strokeWidth = 12,
  showLabel = true,
  label,
  status = 'on-track',
}) => {
  const {colors} = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const getStatusColor = () => {
    switch (status) {
      case 'on-track':
        return colors.success || '#10B981';
      case 'catching-up':
        return colors.warning || '#F59E0B';
      case 'needs-attention':
        return '#D32F2F';
      default:
        return colors.primary || '#2563EB';
    }
  };

  const getStatusMessage = () => {
    if (percentage >= 85) return "You're doing great!";
    if (percentage >= 75) return "You're on track";
    if (percentage >= 60) return 'You can recover';
    return 'Let\'s work on this together';
  };

  const statusColor = getStatusColor();
  
  // Calculate the angle for the progress arc
  const progressAngle = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, {width: size + 40, height: size + 60}]}>
      <View style={[styles.ringContainer, {width: size, height: size}]}>
        {/* Background ring */}
        <View
          style={[
            styles.ringBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: colors.borderLight || '#F0F4F8',
            },
          ]}
        />
        
        {/* Progress indicator - using a filled circle approach */}
        <Animated.View
          style={[
            styles.progressIndicator,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              backgroundColor: statusColor,
              opacity: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 0.1],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.centerContent}>
        {showLabel && (
          <>
            <Text style={[styles.percentage, {color: colors.textPrimary}]}>
              {Math.round(percentage)}%
            </Text>
            {label && (
              <Text style={[styles.label, {color: colors.textMuted}]}>{label}</Text>
            )}
          </>
        )}
      </View>

      <View style={styles.statusMessage}>
        <Text style={[styles.statusText, {color: statusColor}]}>
          {getStatusMessage()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBackground: {
    position: 'absolute',
  },
  progressIndicator: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  percentage: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  statusMessage: {
    marginTop: Spacing.base,
    alignItems: 'center',
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
});

export default ProgressRing;
