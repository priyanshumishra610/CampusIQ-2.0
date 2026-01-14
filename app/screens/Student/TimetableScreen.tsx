/**
 * Timetable / Academics Screen - Premium Redesign
 * Card-based layout with clean, calm design
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {fetchStudentTimetable} from '../../redux/slices';
import {getTimetableForDay, DayOfWeek} from '../../services/timetable.service';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';
import {EmptyState, SkeletonLoader} from '../../components/Common';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TimetableScreen = () => {
  const dispatch = useDispatch();
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const {entries, loading} = useSelector((state: RootState) => state.timetable);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentTimetable({studentId: user.id}) as any);
    }
  }, [dispatch, user]);

  const dayEntries = getTimetableForDay(entries, selectedDay);

  // Get current day of week
  const getCurrentDay = (): DayOfWeek => {
    const day = new Date().getDay();
    const dayMap: {[key: number]: DayOfWeek} = {
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    return dayMap[day] || 'MONDAY';
  };

  if (loading && entries.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <SkeletonLoader width="100%" height={60} style={styles.skeleton} />
        <SkeletonLoader width="100%" height={200} style={styles.skeleton} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Premium Header */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Your Schedule
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Weekly timetable
        </Text>
      </View>

      {/* Day Selector - Premium Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.daySelector, {backgroundColor: colors.surface}]}
        contentContainerStyle={styles.daySelectorContent}>
        {DAYS.map((day, index) => {
          const isActive = selectedDay === day;
          const isToday = day === getCurrentDay();
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                isActive && {
                  backgroundColor: colors.primary,
                },
                !isActive && {
                  backgroundColor: colors.backgroundLight,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.7}>
              {isToday && !isActive && (
                <View style={[styles.todayDot, {backgroundColor: colors.primary}]} />
              )}
              <Text
                style={[
                  styles.dayText,
                  isActive && {color: '#FFFFFF'},
                  !isActive && {color: colors.textSecondary},
                ]}>
                {DAY_NAMES[index]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Classes List - Card-based */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <SkeletonLoader width="100%" height={120} borderRadius={BorderRadius.lg} style={styles.skeletonCard} />
            <SkeletonLoader width="100%" height={120} borderRadius={BorderRadius.lg} style={styles.skeletonCard} />
          </>
        ) : dayEntries.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              variant="no-results"
              customTitle="No classes scheduled"
              customMessage={`You don't have any classes on ${DAY_NAMES[DAYS.indexOf(selectedDay)]}`}
            />
          </View>
        ) : (
          dayEntries.map(entry => (
            <View
              key={entry.id}
              style={[
                styles.classCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}>
              <View style={styles.classHeader}>
                <View style={styles.timeSection}>
                  <Text style={[styles.time, {color: colors.primary}]}>
                    {entry.startTime}
                  </Text>
                  <View style={[styles.timeDivider, {backgroundColor: colors.borderLight}]} />
                  <Text style={[styles.time, {color: colors.textMuted}]}>
                    {entry.endTime}
                  </Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.courseName, {color: colors.textPrimary}]}>
                    {entry.courseName}
                  </Text>
                  <Text style={[styles.courseCode, {color: colors.textMuted}]}>
                    {entry.courseCode}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

              <View style={styles.classDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, {color: colors.textMuted}]}>
                    Faculty
                  </Text>
                  <Text style={[styles.detailValue, {color: colors.textSecondary}]}>
                    {entry.facultyName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, {color: colors.textMuted}]}>
                    Location
                  </Text>
                  <Text style={[styles.detailValue, {color: colors.textSecondary}]}>
                    {entry.building} - {entry.room}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  daySelector: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  daySelectorContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  dayButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  skeleton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  skeletonCard: {
    marginBottom: Spacing.base,
  },
  empty: {
    paddingVertical: Spacing['3xl'],
  },
  classCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  classHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  timeSection: {
    width: 80,
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  time: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  timeDivider: {
    width: 1,
    height: 20,
    marginVertical: Spacing.xs,
  },
  classInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.lg,
  },
  courseCode: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.base,
  },
  classDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default TimetableScreen;
