/**
 * Student Home Dashboard - Assistant-Style Premium Design
 * Calm, supportive, intelligent experience that replaces legacy ERP stress
 * Design Philosophy: Friendly mentor, not authoritative system
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {
  fetchStudentTimetable,
  fetchStudentAttendanceSummary,
  fetchStudentAssignmentSummary,
} from '../../redux/slices';
import {fetchExams} from '../../redux/slices/examSlice';
import {fetchAnnouncements} from '../../redux/slices/announcementSlice';
import {useTheme} from '../../theme/ThemeContext';
import {HeroInsightCard, StatusChip} from '../../components/Student';
import {SkeletonLoader} from '../../components/Common';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

const StudentDashboard = ({navigation}: any) => {
  const dispatch = useDispatch();
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const {entries, currentClass, nextClass, loading: timetableLoading} = useSelector(
    (state: RootState) => state.timetable,
  );
  const {summary: attendanceSummary, loading: attendanceLoading} = useSelector(
    (state: RootState) => state.attendance,
  );
  const {summary: assignmentSummary, loading: assignmentLoading} = useSelector(
    (state: RootState) => state.assignment,
  );
  const {items: exams, loading: examsLoading} = useSelector(
    (state: RootState) => state.exams,
  );
  const {announcements, unreadCount, loading: announcementsLoading} = useSelector(
    (state: RootState) => state.announcement,
  );
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentTimetable({studentId: user.id}) as any);
      dispatch(fetchStudentAttendanceSummary({studentId: user.id}) as any);
      dispatch(fetchStudentAssignmentSummary(user.id) as any);
      dispatch(fetchExams({role: user.role, userId: user.id}) as any);
      dispatch(fetchAnnouncements({userId: user.id, role: user.role, campusId: user.campusId}) as any);
    }
  }, [dispatch, user]);

  const overallAttendance = useMemo(() => {
    if (attendanceSummary.length === 0) return 0;
    return Math.round(
      attendanceSummary.reduce((sum, s) => sum + s.attendancePercentage, 0) /
        attendanceSummary.length,
    );
  }, [attendanceSummary]);

  const getAttendanceStatus = (): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (overallAttendance >= 75) return 'on-track';
    if (overallAttendance >= 60) return 'catching-up';
    return 'needs-attention';
  };

  // Get upcoming exams (next 7 days)
  const upcomingExams = useMemo(() => {
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    return exams.filter(exam => {
      const examDate = exam.scheduledDate instanceof Date
        ? exam.scheduledDate.getTime()
        : exam.scheduledDate?.toDate?.().getTime() || 0;
      return examDate > now && examDate <= sevenDaysFromNow;
    }).sort((a, b) => {
      const aDate = a.scheduledDate instanceof Date
        ? a.scheduledDate.getTime()
        : a.scheduledDate?.toDate?.().getTime() || 0;
      const bDate = b.scheduledDate instanceof Date
        ? b.scheduledDate.getTime()
        : b.scheduledDate?.toDate?.().getTime() || 0;
      return aDate - bDate;
    });
  }, [exams]);

  // Get urgent assignments (due within 3 days)
  const urgentAssignments = useMemo(() => {
    if (!assignmentSummary) return 0;
    // This is a simplified calculation - in real app, check actual due dates
    return assignmentSummary.overdue || 0;
  }, [assignmentSummary]);

  // Dynamic Hero Insight - Changes based on student's current state
  const getHeroInsight = useMemo(() => {
    const pendingAssignments = assignmentSummary?.pending || 0;
    const hasUpcomingExams = upcomingExams.length > 0;
    const attendanceStatus: 'on-track' | 'catching-up' | 'needs-attention' = 
      overallAttendance >= 75 ? 'on-track' :
      overallAttendance >= 60 ? 'catching-up' :
      'needs-attention';

    // Priority 1: Urgent assignments
    if (urgentAssignments > 0 || pendingAssignments > 3) {
      return {
        title: "Assignments Need Attention",
        value: `${pendingAssignments} pending`,
        subtitle: "Let's get these completed",
        status: 'needs-attention' as const,
        message: "One class needs your attention",
      };
    }

    // Priority 2: Upcoming exams
    if (hasUpcomingExams) {
      return {
        title: "Exams Coming Up",
        value: `${upcomingExams.length} exam${upcomingExams.length > 1 ? 's' : ''}`,
        subtitle: "You have an exam coming up next week",
        status: 'catching-up' as const,
        message: "One class needs your attention",
      };
    }

    // Priority 3: Attendance status
    if (attendanceStatus === 'needs-attention') {
      return {
        title: "Attendance Update",
        value: `${overallAttendance}%`,
        subtitle: "Let's work on this together",
        status: 'needs-attention' as const,
        message: "One class needs your attention",
      };
    }

    // Default: All good
    return {
      title: "You're All Set",
      value: "🎉",
      subtitle: "Nothing urgent right now — you're good",
      status: 'on-track' as const,
      message: "You're all set for today 🎉",
    };
  }, [urgentAssignments, assignmentSummary, upcomingExams, overallAttendance]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (hour < 12) return `Good morning`;
    if (hour < 17) return `Good afternoon`;
    return `Good evening`;
  };

  const getWeekContext = () => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7));
    return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Get today's classes
  const todaysClasses = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    return entries.filter(entry => entry.dayOfWeek === today);
  }, [entries]);

  const handleDismissAnnouncement = (id: string) => {
    setDismissedAnnouncements(prev => new Set(prev).add(id));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.has(a.id));

  const isLoading = timetableLoading || attendanceLoading || assignmentLoading || announcementsLoading || examsLoading;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Soft Greeting with Context */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.greeting, {color: colors.textPrimary}]}>
          {getGreeting()}, {user?.name?.split(' ')[0]}
        </Text>
        <Text style={[styles.subtitle, {color: colors.textMuted}]}>
          {getWeekContext()}
        </Text>
      </View>

      {/* Dynamic Hero Insight Card - ONE primary focus */}
      {!isLoading && (
        <View style={styles.heroSection}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => {
              if (getHeroInsight.status === 'needs-attention' && urgentAssignments > 0) {
                navigation.navigate('Assignments');
              } else if (upcomingExams.length > 0) {
                navigation.navigate('Exams');
              } else {
                navigation.navigate('Attendance');
              }
            }}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}>
              <Text style={[styles.heroTitle, {color: colors.textSecondary}]}>
                {getHeroInsight.title}
              </Text>
              <Text style={[styles.heroValue, {color: colors.textPrimary}]}>
                {getHeroInsight.value}
              </Text>
              <Text style={[styles.heroSubtitle, {color: colors.textMuted}]}>
                {getHeroInsight.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && (
        <View style={styles.heroSection}>
          <SkeletonLoader width="100%" height={140} borderRadius={BorderRadius.lg} />
        </View>
      )}

      {/* Today's Focus */}
      <View style={styles.todaysFocusSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Today's Focus
        </Text>

        {/* Current/Next Class */}
        {(currentClass || nextClass) && (
          <TouchableOpacity
            style={[
              styles.focusCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Timetable')}
            activeOpacity={0.7}>
            <View style={styles.focusCardHeader}>
              <View style={styles.focusCardLeft}>
                <Text style={[styles.focusCardLabel, {color: colors.textMuted}]}>
                  {currentClass ? 'Current Class' : 'Next Class'}
                </Text>
                <Text style={[styles.focusCardTitle, {color: colors.textPrimary}]}>
                  {currentClass?.courseName || nextClass?.courseName}
                </Text>
                {(currentClass || nextClass) && (
                  <Text style={[styles.focusCardSubtext, {color: colors.textMuted}]}>
                    {currentClass
                      ? `${currentClass.building} - ${currentClass.room}`
                      : nextClass
                      ? `${nextClass.building} - ${nextClass.room}`
                      : ''}
                  </Text>
                )}
              </View>
              <View style={[styles.timeBadge, {backgroundColor: colors.primaryAccentLight}]}>
                <Text style={[styles.timeText, {color: colors.primary}]}>
                  {currentClass
                    ? `${currentClass.startTime} - ${currentClass.endTime}`
                    : nextClass
                    ? `${nextClass.startTime} - ${nextClass.endTime}`
                    : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Important Deadlines */}
        {assignmentSummary && assignmentSummary.pending > 0 && (
          <TouchableOpacity
            style={[
              styles.focusCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Assignments')}
            activeOpacity={0.7}>
            <View style={styles.focusCardHeader}>
              <View style={styles.focusCardLeft}>
                <Text style={[styles.focusCardLabel, {color: colors.textMuted}]}>
                  Assignments
                </Text>
                <Text style={[styles.focusCardTitle, {color: colors.textPrimary}]}>
                  {assignmentSummary.pending} pending
                </Text>
                <Text style={[styles.focusCardSubtext, {color: colors.textMuted}]}>
                  {assignmentSummary.overdue > 0
                    ? `${assignmentSummary.overdue} overdue`
                    : 'Review and complete'}
                </Text>
              </View>
              <StatusChip
                status={assignmentSummary.pending > 3 || assignmentSummary.overdue > 0 ? 'needs-attention' : 'catching-up'}
                size="sm"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Academic Health Snapshot */}
      <View style={styles.healthSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Academic Health
        </Text>
        <View
          style={[
            styles.healthCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}>
          <View style={styles.healthRow}>
            <View style={styles.healthItem}>
              <Text style={[styles.healthLabel, {color: colors.textMuted}]}>
                Attendance
              </Text>
              <StatusChip status={getAttendanceStatus()} size="sm" style={styles.healthChip} />
            </View>
            {upcomingExams.length > 0 && (
              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, {color: colors.textMuted}]}>
                  Upcoming Exams
                </Text>
                <Text style={[styles.healthValue, {color: colors.textPrimary}]}>
                  {upcomingExams.length} in next week
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Quick Actions - Max 3 */}
      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Quick Actions
        </Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Attendance')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={[styles.quickActionLabel, {color: colors.textPrimary}]}>
              View Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Timetable')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={[styles.quickActionLabel, {color: colors.textPrimary}]}>
              View Timetable
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => navigation.navigate('Exams')}
            activeOpacity={0.7}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={[styles.quickActionLabel, {color: colors.textPrimary}]}>
              View Exams
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Announcements / Events - Timeline style, Dismissible, Low priority */}
      {visibleAnnouncements.length > 0 && (
        <View style={styles.announcementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
              Updates & Events
            </Text>
          </View>
          {visibleAnnouncements.slice(0, 3).map((announcement, index) => (
            <View
              key={announcement.id}
              style={[
                styles.announcementCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}>
              <View style={styles.announcementHeader}>
                <View style={styles.announcementContent}>
                  <Text style={[styles.announcementTitle, {color: colors.textPrimary}]} numberOfLines={2}>
                    {announcement.title}
                  </Text>
                  <Text style={[styles.announcementMeta, {color: colors.textMuted}]}>
                    {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' • '}
                    {announcement.authorName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => handleDismissAnnouncement(announcement.id)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Text style={[styles.dismissIcon, {color: colors.textMuted}]}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
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
  greeting: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
  heroSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  heroTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  heroValue: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginBottom: Spacing.xs,
    lineHeight: Typography.fontSize['4xl'] * 1.1,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    marginTop: Spacing.xs,
  },
  todaysFocusSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.base,
  },
  focusCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  focusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  focusCardLeft: {
    flex: 1,
    marginRight: Spacing.base,
  },
  focusCardLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  focusCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  focusCardSubtext: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  timeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  timeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  healthSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  healthCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthItem: {
    flex: 1,
  },
  healthLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  healthValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  healthChip: {
    marginTop: Spacing.xs,
  },
  quickActionsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  quickActionCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  announcementsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  announcementCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  announcementContent: {
    flex: 1,
    marginRight: Spacing.base,
  },
  announcementTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  announcementMeta: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
  },
  dismissButton: {
    padding: Spacing.xs,
  },
  dismissIcon: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default StudentDashboard;
