/**
 * Library - Premium Redesign
 * Calm, card-based UI for library books with supportive messaging
 */

import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {useTheme} from '../../theme/ThemeContext';
import {StatusChip, HeroInsightCard} from '../../components/Student';
import {EmptyState, SkeletonLoader} from '../../components/Common';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

// Mock library data - replace with actual API call
const mockBooks = [
  {
    id: '1',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '978-0262033848',
    issueDate: new Date('2024-01-15').getTime(),
    returnDate: new Date('2024-02-15').getTime(),
    status: 'on-track',
  },
  {
    id: '2',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    issueDate: new Date('2024-02-01').getTime(),
    returnDate: new Date('2024-02-28').getTime(),
    status: 'due-soon',
  },
  {
    id: '3',
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Gang of Four',
    isbn: '978-0201633610',
    issueDate: new Date('2024-01-20').getTime(),
    returnDate: new Date('2024-02-20').getTime(),
    status: 'overdue',
  },
];

const LibraryScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const [books, setBooks] = useState(mockBooks);
  const [loading, setLoading] = useState(false);

  const totalBooks = books.length;
  const nearestReturnDate = useMemo(() => {
    if (books.length === 0) return null;
    const upcomingReturns = books
      .filter(b => b.returnDate >= Date.now())
      .sort((a, b) => a.returnDate - b.returnDate);
    return upcomingReturns.length > 0 ? upcomingReturns[0].returnDate : null;
  }, [books]);

  const getBookStatus = (book: typeof books[0]): 'on-track' | 'catching-up' | 'needs-attention' => {
    const now = Date.now();
    const daysUntilReturn = Math.ceil((book.returnDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilReturn < 0) return 'needs-attention'; // Overdue
    if (daysUntilReturn <= 3) return 'catching-up'; // Due soon
    return 'on-track';
  };

  const getStatusChipType = (status: string): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (status === 'overdue') return 'needs-attention';
    if (status === 'due-soon') return 'catching-up';
    return 'on-track';
  };

  const getReminderMessage = (book: typeof books[0]) => {
    const now = Date.now();
    const daysUntilReturn = Math.ceil((book.returnDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilReturn < 0) {
      const daysOverdue = Math.abs(daysUntilReturn);
      return `Please return when convenient — ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
    }
    if (daysUntilReturn === 0) {
      return 'Return date is today — you can renew if needed';
    }
    if (daysUntilReturn <= 3) {
      return `Return in ${daysUntilReturn} day${daysUntilReturn > 1 ? 's' : ''} — consider renewing if you need more time`;
    }
    return `Due in ${daysUntilReturn} days — you're all set`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilReturn = (returnDate: number) => {
    const now = Date.now();
    const days = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getNearestReturnMessage = () => {
    if (!nearestReturnDate) return 'No upcoming returns';
    const days = getDaysUntilReturn(nearestReturnDate);
    if (days < 0) return 'Some books are overdue';
    if (days === 0) return 'Return date is today';
    if (days === 1) return 'Return due tomorrow';
    return `Next return in ${days} days`;
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Library
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Your borrowed books and reading materials
        </Text>
      </View>

      {/* Library Overview Card */}
      {!loading && books.length > 0 && (
        <View style={styles.overviewSection}>
          <HeroInsightCard
            title="Library Overview"
            value={totalBooks}
            subtitle={totalBooks === 1 ? 'book issued' : 'books issued'}
            status={nearestReturnDate && getDaysUntilReturn(nearestReturnDate) <= 3 ? 'catching-up' : 'on-track'}
          />
          {nearestReturnDate && (
            <View
              style={[
                styles.nearestReturnCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}>
              <Text style={[styles.nearestReturnLabel, {color: colors.textMuted}]}>
                Nearest Return Date
              </Text>
              <Text style={[styles.nearestReturnDate, {color: colors.textPrimary}]}>
                {formatDate(nearestReturnDate)}
              </Text>
              <Text style={[styles.nearestReturnMessage, {color: colors.textSecondary}]}>
                {getNearestReturnMessage()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Books List */}
      <View style={styles.booksSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Your Books
        </Text>

        {loading ? (
          <>
            <SkeletonLoader width="100%" height={180} borderRadius={BorderRadius.lg} style={styles.skeleton} />
            <SkeletonLoader width="100%" height={180} borderRadius={BorderRadius.lg} style={styles.skeleton} />
          </>
        ) : books.length === 0 ? (
          <EmptyState
            variant="no-results"
            customTitle="No books issued"
            customMessage="You don't have any books issued at the moment. Visit the library to borrow books for your studies."
          />
        ) : (
          books.map(book => {
            const status = getBookStatus(book);
            const statusChipType = getStatusChipType(book.status);
            const reminderMessage = getReminderMessage(book);

            return (
              <View
                key={book.id}
                style={[
                  styles.bookCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}>
                <View style={styles.bookHeader}>
                  <View style={styles.bookHeaderLeft}>
                    <Text style={[styles.bookTitle, {color: colors.textPrimary}]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={[styles.bookAuthor, {color: colors.textMuted}]}>
                      by {book.author}
                    </Text>
                  </View>
                  <StatusChip status={statusChipType} size="sm" />
                </View>

                <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

                <View style={styles.bookDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, {color: colors.textMuted}]}>
                      ISBN
                    </Text>
                    <Text style={[styles.detailValue, {color: colors.textSecondary}]}>
                      {book.isbn}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, {color: colors.textMuted}]}>
                      Issued On
                    </Text>
                    <Text style={[styles.detailValue, {color: colors.textSecondary}]}>
                      {formatDate(book.issueDate)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, {color: colors.textMuted}]}>
                      Return Date
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        status === 'needs-attention' && {color: '#D32F2F'},
                        status === 'catching-up' && {color: colors.warning || '#F59E0B'},
                        status === 'on-track' && {color: colors.textSecondary},
                      ]}>
                      {formatDate(book.returnDate)}
                    </Text>
                  </View>
                </View>

                {/* Gentle Reminder */}
                <View
                  style={[
                    styles.reminderBar,
                    {
                      backgroundColor:
                        status === 'needs-attention'
                          ? '#FEF5F5'
                          : status === 'catching-up'
                          ? colors.warningLight || '#FEF3C7'
                          : colors.successLight || '#D1FAE5',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.reminderText,
                      {
                        color:
                          status === 'needs-attention'
                            ? '#D32F2F'
                            : status === 'catching-up'
                            ? colors.warning || '#F59E0B'
                            : colors.success || '#10B981',
                      },
                    ]}>
                    {reminderMessage}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.primaryAccentLight,
                        borderColor: colors.primary,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text style={[styles.actionButtonText, {color: colors.primary}]}>
                      Renew
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderLight,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text style={[styles.actionButtonText, {color: colors.textSecondary}]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Helpful Information */}
      {books.length > 0 && (
        <View style={styles.infoSection}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}>
            <Text style={[styles.infoTitle, {color: colors.textPrimary}]}>
              Need Help?
            </Text>
            <Text style={[styles.infoText, {color: colors.textMuted}]}>
              You can renew books before the return date, or visit the library for assistance. We're here to help!
            </Text>
          </View>
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
  overviewSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  nearestReturnCard: {
    marginTop: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  nearestReturnLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  nearestReturnDate: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  nearestReturnMessage: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  booksSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.base,
  },
  skeleton: {
    marginBottom: Spacing.base,
  },
  bookCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  bookHeaderLeft: {
    flex: 1,
    marginRight: Spacing.base,
  },
  bookTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.base,
  },
  bookDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.base,
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
  reminderBar: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  reminderText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  infoSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  infoCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  infoTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
});

export default LibraryScreen;
