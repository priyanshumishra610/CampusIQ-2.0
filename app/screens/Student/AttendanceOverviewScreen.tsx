/**
 * Attendance Overview - Premium Redesign
 * Large animated progress ring, friendly status text, and predictive guidance
 */

import React, {useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {
  fetchStudentAttendanceSummary,
  fetchStudentAttendanceStats,
} from '../../redux/slices/attendanceSlice';
import {EmptyState, SkeletonLoader, RetryButton} from '../../components/Common';
import {ProgressRing, SubjectCard} from '../../components/Student';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius} from '../../theme/designTokens';

const AttendanceOverviewScreen = () => {
  const dispatch = useDispatch();
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const {summary, stats, loading, error} = useSelector(
    (state: RootState) => state.attendance,
  );

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAttendanceSummary({studentId: user.id}) as any);
      dispatch(fetchStudentAttendanceStats(user.id) as any);
    }
  }, [dispatch, user]);

  const overallAttendance = useMemo(() => {
    if (summary.length === 0) return 0;
    return Math.round(
      summary.reduce((sum, s) => sum + s.attendancePercentage, 0) / summary.length,
    );
  }, [summary]);

  const getStatus = (percentage: number): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (percentage >= 85) return 'on-track';
    if (percentage >= 75) return 'catching-up';
    return 'needs-attention';
  };

  const getGuidanceMessage = (item: typeof summary[0]) => {
    if (item.attendancePercentage >= 75) {
      return 'Keep up the great attendance!';
    }
    const classesNeeded = Math.ceil((0.75 * item.totalClasses - item.presentCount) / (1 - 0.75));
    if (classesNeeded <= 2) {
      return `Attend next ${classesNeeded} class${classesNeeded > 1 ? 'es' : ''} to improve`;
    }
    return `Attend next ${classesNeeded} classes to get back on track`;
  };

  const handleRetry = () => {
    if (user?.id) {
      dispatch(fetchStudentAttendanceSummary({studentId: user.id}) as any);
      dispatch(fetchStudentAttendanceStats(user.id) as any);
    }
  };

  if (loading && summary.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <SkeletonLoader width="100%" height={200} style={styles.skeleton} />
        <SkeletonLoader width="100%" height={300} style={styles.skeleton} />
      </View>
    );
  }

  if (error && summary.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <RetryButton onPress={handleRetry} message={error} />
      </View>
    );
  }

  const overallStatus = getStatus(overallAttendance);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Attendance
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Your attendance overview
        </Text>
      </View>

      {/* Large Animated Progress Ring */}
      <View style={styles.progressSection}>
        <ProgressRing
          percentage={overallAttendance}
          size={160}
          strokeWidth={14}
          status={overallStatus}
          label="Overall"
        />
      </View>

      {/* Statistics - Calm, Supportive */}
      {stats && (
        <View
          style={[
            styles.statsCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}>
          <Text style={[styles.statsTitle, {color: colors.textSecondary}]}>
            This Semester
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: colors.textPrimary}]}>
                {stats.totalClasses || 0}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>
                Total Classes
              </Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: colors.borderLight}]} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {color: colors.success || '#10B981'},
                ]}>
                {stats.presentCount || 0}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>
                Present
              </Text>
            </View>
            <View style={[styles.statDivider, {backgroundColor: colors.borderLight}]} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {color: colors.textMuted},
                ]}>
                {stats.absentCount || 0}
              </Text>
              <Text style={[styles.statLabel, {color: colors.textMuted}]}>
                Absent
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Subject-wise Cards with Guidance */}
      <View style={styles.subjectsSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          By Subject
        </Text>
        {summary.length === 0 ? (
          <EmptyState
            variant="no-results"
            customTitle="No attendance data"
            customMessage="Your attendance records will appear here once classes begin"
          />
        ) : (
          summary.map((item, index) => (
            <SubjectCard
              key={index}
              courseName={item.courseName}
              courseCode={item.courseCode}
              attendancePercentage={item.attendancePercentage}
              presentCount={item.presentCount}
              totalClasses={item.totalClasses}
              guidance={getGuidanceMessage(item)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing['4xl'],
  },
  skeleton: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
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
  progressSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  statsCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.base,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectsSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.base,
  },
});

export default AttendanceOverviewScreen;
