/**
 * Exams & Assessments - Premium Redesign
 * Timeline view with calm, supportive design
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {EmptyState, SkeletonList} from '../../components/Common';
import {StatusChip} from '../../components/Student';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';
import {Exam} from '../../redux/slices/examSlice';

const ExamsScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const {items: exams, loading} = useSelector((state: RootState) => state.exams);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL');

  const filteredExams = useMemo(() => {
    const now = Date.now();
    return exams.filter(exam => {
      const examDate = exam.scheduledDate instanceof Date
        ? exam.scheduledDate.getTime()
        : exam.scheduledDate?.toDate?.().getTime() || 0;

      if (filter === 'UPCOMING') return examDate > now;
      if (filter === 'PAST') return examDate < now;
      return true;
    }).sort((a, b) => {
      const aDate = a.scheduledDate instanceof Date
        ? a.scheduledDate.getTime()
        : a.scheduledDate?.toDate?.().getTime() || 0;
      const bDate = b.scheduledDate instanceof Date
        ? b.scheduledDate.getTime()
        : b.scheduledDate?.toDate?.().getTime() || 0;
      return aDate - bDate;
    });
  }, [exams, filter]);

  const getTimeUntil = (exam: Exam) => {
    const examDate = exam.scheduledDate instanceof Date
      ? exam.scheduledDate
      : exam.scheduledDate?.toDate?.() || new Date();
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 7) return `${days} days`;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatus = (exam: Exam): 'on-track' | 'catching-up' | 'needs-attention' => {
    const examDate = exam.scheduledDate instanceof Date
      ? exam.scheduledDate
      : exam.scheduledDate?.toDate?.() || new Date();
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'on-track'; // Past exam
    if (days <= 1) return 'needs-attention';
    if (days <= 7) return 'catching-up';
    return 'on-track';
  };

  const renderExam = ({item}: {item: Exam}) => {
    const examDate = item.scheduledDate instanceof Date
      ? item.scheduledDate
      : item.scheduledDate?.toDate?.() || new Date();
    const timeUntil = getTimeUntil(item);
    const isUpcoming = examDate.getTime() > Date.now();
    const status = getStatus(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
        onPress={() => navigation.navigate('ExamDetail', {examId: item.id})}
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
          {isUpcoming && <StatusChip status={status} size="sm" />}
        </View>

        <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

        <View style={styles.cardBody}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateSection}>
              <Text style={[styles.dateLabel, {color: colors.textMuted}]}>Date</Text>
              <Text style={[styles.date, {color: colors.textPrimary}]}>
                {examDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.timeSection}>
              <Text style={[styles.timeLabel, {color: colors.textMuted}]}>Time</Text>
              <Text style={[styles.time, {color: colors.textPrimary}]}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
          </View>

          {item.room && item.building && (
            <View style={styles.locationRow}>
              <Text style={[styles.locationLabel, {color: colors.textMuted}]}>Location</Text>
              <Text style={[styles.location, {color: colors.textSecondary}]}>
                {item.building} - {item.room}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, {backgroundColor: colors.primaryAccentLight}]}>
              <Text style={[styles.metaText, {color: colors.primary}]}>
                {item.examType}
              </Text>
            </View>
            <Text style={[styles.duration, {color: colors.textMuted}]}>
              {item.duration} minutes
            </Text>
          </View>

          {timeUntil && isUpcoming && (
            <View style={[styles.countdownBar, {backgroundColor: colors.primaryAccentLight}]}>
              <Text style={[styles.countdownText, {color: colors.primary}]}>
                {timeUntil} until exam
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && exams.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {backgroundColor: colors.surface}]}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>Exams</Text>
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>Exams</Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Your exam schedule
        </Text>
      </View>

      {/* Filter Pills */}
      <View style={[styles.filters, {backgroundColor: colors.surface}]}>
        {(['ALL', 'UPCOMING', 'PAST'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              filter === f && {
                backgroundColor: colors.primary,
              },
              filter !== f && {
                backgroundColor: colors.backgroundLight,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.filterText,
                filter === f && {color: '#FFFFFF'},
                filter !== f && {color: colors.textSecondary},
              ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredExams}
        keyExtractor={item => item.id}
        renderItem={renderExam}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            variant="no-exams"
            customMessage={
              filter === 'UPCOMING'
                ? 'No upcoming exams scheduled'
                : filter === 'PAST'
                ? 'No past exams'
                : 'No exams scheduled'
            }
          />
        }
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
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
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
    gap: Spacing.base,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  dateSection: {
    flex: 1,
  },
  dateLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  timeSection: {
    flex: 1,
  },
  timeLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  time: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  location: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  countdownBar: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ExamsScreen;
