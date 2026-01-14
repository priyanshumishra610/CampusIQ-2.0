/**
 * Announcements & Events - Premium Redesign
 * Card-based timeline with calm, supportive design
 */

import React, {useEffect} from 'react';
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
  fetchAnnouncements,
  markAnnouncementAsRead,
} from '../../redux/slices/announcementSlice';
import {EmptyState, SkeletonList, RetryButton} from '../../components/Common';
import {useTheme} from '../../theme/ThemeContext';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

const AnnouncementsScreen = ({navigation}: any) => {
  const dispatch = useDispatch();
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const {announcements, unreadCount, loading, error} = useSelector(
    (state: RootState) => state.announcement,
  );

  useEffect(() => {
    if (user?.id) {
      dispatch(
        fetchAnnouncements({
          userId: user.id,
          role: user.role,
          campusId: user.campusId,
          departmentId: user.department,
        }) as any,
      );
    }
  }, [dispatch, user]);

  const handlePress = async (announcement: typeof announcements[0]) => {
    if (user?.id && (!announcement.readBy || !announcement.readBy.includes(user.id))) {
      dispatch(markAnnouncementAsRead({announcementId: announcement.id, userId: user.id}) as any);
    }
    navigation.navigate('AnnouncementDetail', {announcementId: announcement.id});
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#DC2626'; // Only for truly critical
      case 'HIGH':
        return colors.warning || '#F59E0B';
      case 'MEDIUM':
        return colors.info || '#3B82F6';
      default:
        return colors.textMuted;
    }
  };

  const renderAnnouncement = ({item}: {item: typeof announcements[0]}) => {
    const isUnread = !item.readBy || !item.readBy.includes(user?.id || '');
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            borderLeftWidth: isUnread ? 4 : 1,
            borderLeftColor: isUnread ? colors.primary : colors.borderLight,
          },
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {isUnread && (
              <View style={[styles.unreadDot, {backgroundColor: colors.primary}]} />
            )}
            <Text style={[styles.title, {color: colors.textPrimary}]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          {item.priority !== 'LOW' && (
            <View
              style={[
                styles.priorityBadge,
                {backgroundColor: `${priorityColor}15`},
              ]}>
              <Text style={[styles.priorityText, {color: priorityColor}]}>
                {item.priority}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.content, {color: colors.textSecondary}]} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={[styles.author, {color: colors.textMuted}]}>
              {item.authorName}
            </Text>
            <Text style={[styles.date, {color: colors.textMuted}]}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleRetry = () => {
    if (user?.id) {
      dispatch(
        fetchAnnouncements({
          userId: user.id,
          role: user.role,
          campusId: user.campusId,
          departmentId: user.department,
        }) as any,
      );
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {backgroundColor: colors.surface}]}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
            Announcements
          </Text>
        </View>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={[styles.header, {backgroundColor: colors.surface}]}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
            Announcements
          </Text>
        </View>
        <RetryButton onPress={handleRetry} message={error} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
            Announcements
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, {backgroundColor: colors.primary}]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Stay updated with campus news and important information
        </Text>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={item => item.id}
        renderItem={renderAnnouncement}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            variant="no-results"
            customTitle="No announcements"
            customMessage="You're all caught up! No new announcements."
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.extrabold,
    marginRight: Spacing.sm,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
  },
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    marginBottom: Spacing.base,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.base,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  author: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  date: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
  },
});

export default AnnouncementsScreen;
