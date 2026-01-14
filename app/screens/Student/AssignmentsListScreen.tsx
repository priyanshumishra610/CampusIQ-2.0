/**
 * Assignments List - Premium Redesign
 * Card-based layout with calm, supportive status indicators
 */

import React, {useEffect, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {
  fetchStudentAssignments,
  fetchStudentAssignmentSummary,
} from '../../redux/slices/assignmentSlice';
import {EmptyState, SkeletonList, RetryButton} from '../../components/Common';
import {StatusChip} from '../../components/Student';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

const AssignmentsListScreen = ({navigation}: any) => {
  const dispatch = useDispatch();
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const {assignments, summary, loading, error} = useSelector(
    (state: RootState) => state.assignment,
  );

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAssignments({studentId: user.id}) as any);
      dispatch(fetchStudentAssignmentSummary(user.id) as any);
    }
  }, [dispatch, user]);

  const now = Date.now();
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const aOverdue = now > a.dueDate;
      const bOverdue = now > b.dueDate;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return a.dueDate - b.dueDate;
    });
  }, [assignments, now]);

  const getStatus = (assignment: typeof assignments[0]): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (now > assignment.dueDate) return 'needs-attention';
    const daysLeft = (assignment.dueDate - now) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 1) return 'needs-attention';
    if (daysLeft <= 3) return 'catching-up';
    return 'on-track';
  };

  const getStatusText = (assignment: typeof assignments[0]) => {
    if (now > assignment.dueDate) {
      const daysOverdue = Math.ceil((now - assignment.dueDate) / (1000 * 60 * 60 * 24));
      return `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
    }
    const daysLeft = Math.ceil((assignment.dueDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

  const handleRetry = () => {
    if (user?.id) {
      dispatch(fetchStudentAssignments({studentId: user.id}) as any);
      dispatch(fetchStudentAssignmentSummary(user.id) as any);
    }
  };

  const renderAssignment = ({item}: {item: typeof assignments[0]}) => {
    const status = getStatus(item);
    const statusText = getStatusText(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
        onPress={() => navigation.navigate('AssignmentDetail', {assignmentId: item.id})}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.courseCode, {color: colors.textMuted}]}>
              {item.courseCode}
            </Text>
            <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <StatusChip status={status} size="sm" />
        </View>

        <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, {color: colors.textMuted}]}>Due date</Text>
            <Text style={[styles.metaValue, {color: colors.textSecondary}]}>
              {new Date(item.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, {color: colors.textMuted}]}>Time</Text>
            <Text style={[styles.metaValue, {color: colors.textSecondary}]}>
              {new Date(item.dueDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, {color: colors.textMuted}]}>Faculty</Text>
            <Text style={[styles.metaValue, {color: colors.textSecondary}]}>
              {item.facultyName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, {color: colors.textMuted}]}>Max marks</Text>
            <Text style={[styles.metaValue, {color: colors.textSecondary}]}>
              {item.maxMarks}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBar, {backgroundColor: colors.borderLight}]}>
          <Text style={[styles.statusText, {color: colors.textMuted}]}>
            {statusText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && assignments.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {backgroundColor: colors.surface}]}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
            Assignments
          </Text>
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error && assignments.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {backgroundColor: colors.surface}]}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
            Assignments
          </Text>
        </View>
        <RetryButton onPress={handleRetry} message={error} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Assignments
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Your assignments and deadlines
        </Text>
        {summary && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, {color: colors.textPrimary}]}>
                {summary.total}
              </Text>
              <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>Total</Text>
            </View>
            <View style={[styles.summaryDivider, {backgroundColor: colors.borderLight}]} />
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  {color: summary.pending > 0 ? colors.warning : colors.textMuted},
                ]}>
                {summary.pending}
              </Text>
              <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>Pending</Text>
            </View>
            <View style={[styles.summaryDivider, {backgroundColor: colors.borderLight}]} />
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  {color: summary.overdue > 0 ? '#D32F2F' : colors.textMuted},
                ]}>
                {summary.overdue}
              </Text>
              <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>Overdue</Text>
            </View>
            <View style={[styles.summaryDivider, {backgroundColor: colors.borderLight}]} />
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryValue,
                  {color: colors.success || '#10B981'},
                ]}>
                {summary.submitted}
              </Text>
              <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>Submitted</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={sortedAssignments}
        keyExtractor={item => item.id}
        renderItem={renderAssignment}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            variant="no-results"
            customTitle="No assignments"
            customMessage="You're all caught up! No assignments at the moment."
          />
        }
        refreshing={loading}
        onRefresh={handleRetry}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.sm,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  cardHeaderLeft: {
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
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.base,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statusBar: {
    marginTop: Spacing.base,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
});

export default AssignmentsListScreen;
