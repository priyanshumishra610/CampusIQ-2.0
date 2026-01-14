/**
 * Payments - Premium Redesign
 * Trust-focused, calm design for fee payments
 */

import React, {useState, useEffect} from 'react';
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
import {StatusChip} from '../../components/Student';
import {EmptyState, SkeletonLoader} from '../../components/Common';
import {Typography, Spacing, BorderRadius, Shadows} from '../../theme/designTokens';

// Mock payment data - replace with actual API call
const mockPayments = [
  {
    id: '1',
    type: 'Tuition Fee',
    amount: 50000,
    dueDate: new Date('2024-03-15').getTime(),
    status: 'pending',
    description: 'Semester tuition fee',
  },
  {
    id: '2',
    type: 'Library Fee',
    amount: 2000,
    dueDate: new Date('2024-02-28').getTime(),
    status: 'paid',
    description: 'Annual library membership',
    paidDate: new Date('2024-02-15').getTime(),
  },
  {
    id: '3',
    type: 'Lab Fee',
    amount: 5000,
    dueDate: new Date('2024-04-01').getTime(),
    status: 'pending',
    description: 'Laboratory equipment fee',
  },
];

const PaymentsScreen = ({navigation}: any) => {
  const {colors} = useTheme();
  const {user} = useSelector((state: RootState) => state.auth);
  const [payments, setPayments] = useState(mockPayments);
  const [loading, setLoading] = useState(false);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const getPaymentStatus = (payment: typeof payments[0]): 'on-track' | 'catching-up' | 'needs-attention' => {
    if (payment.status === 'paid') return 'on-track';
    const daysUntilDue = Math.ceil((payment.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) return 'needs-attention';
    if (daysUntilDue <= 7) return 'catching-up';
    return 'on-track';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View style={[styles.header, {backgroundColor: colors.surface}]}>
        <Text style={[styles.headerTitle, {color: colors.textPrimary}]}>
          Payments
        </Text>
        <Text style={[styles.headerSubtitle, {color: colors.textMuted}]}>
          Manage your fees and payments securely
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}>
          <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>
            Pending Payments
          </Text>
          <Text style={[styles.summaryValue, {color: '#D32F2F'}]}>
            {formatCurrency(totalPending)}
          </Text>
          <Text style={[styles.summaryCount, {color: colors.textMuted}]}>
            {payments.filter(p => p.status === 'pending').length} payment
            {payments.filter(p => p.status === 'pending').length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}>
          <Text style={[styles.summaryLabel, {color: colors.textMuted}]}>
            Paid This Semester
          </Text>
          <Text style={[styles.summaryValue, {color: colors.success || '#10B981'}]}>
            {formatCurrency(totalPaid)}
          </Text>
          <Text style={[styles.summaryCount, {color: colors.textMuted}]}>
            {payments.filter(p => p.status === 'paid').length} payment
            {payments.filter(p => p.status === 'paid').length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Payment List */}
      <View style={styles.paymentsSection}>
        <Text style={[styles.sectionTitle, {color: colors.textSecondary}]}>
          Payment History
        </Text>

        {loading ? (
          <>
            <SkeletonLoader width="100%" height={120} borderRadius={BorderRadius.lg} style={styles.skeleton} />
            <SkeletonLoader width="100%" height={120} borderRadius={BorderRadius.lg} style={styles.skeleton} />
          </>
        ) : payments.length === 0 ? (
          <EmptyState
            variant="no-results"
            customTitle="No payments"
            customMessage="Your payment history will appear here"
          />
        ) : (
          payments.map(payment => {
            const status = getPaymentStatus(payment);
            const isOverdue = payment.status === 'pending' && payment.dueDate < Date.now();

            return (
              <View
                key={payment.id}
                style={[
                  styles.paymentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentHeaderLeft}>
                    <Text style={[styles.paymentType, {color: colors.textPrimary}]}>
                      {payment.type}
                    </Text>
                    <Text style={[styles.paymentDescription, {color: colors.textMuted}]}>
                      {payment.description}
                    </Text>
                  </View>
                  <StatusChip status={status} size="sm" />
                </View>

                <View style={[styles.divider, {backgroundColor: colors.borderLight}]} />

                <View style={styles.paymentBody}>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, {color: colors.textMuted}]}>
                      Amount
                    </Text>
                    <Text style={[styles.paymentAmount, {color: colors.textPrimary}]}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>

                  {payment.status === 'pending' && (
                    <View style={styles.paymentRow}>
                      <Text style={[styles.paymentLabel, {color: colors.textMuted}]}>
                        Due Date
                      </Text>
                      <Text
                        style={[
                          styles.paymentDate,
                          isOverdue && {color: '#D32F2F'},
                          !isOverdue && {color: colors.textSecondary},
                        ]}>
                        {formatDate(payment.dueDate)}
                        {isOverdue && ' (Overdue)'}
                      </Text>
                    </View>
                  )}

                  {payment.status === 'paid' && payment.paidDate && (
                    <View style={styles.paymentRow}>
                      <Text style={[styles.paymentLabel, {color: colors.textMuted}]}>
                        Paid On
                      </Text>
                      <Text style={[styles.paymentDate, {color: colors.success || '#10B981'}]}>
                        {formatDate(payment.paidDate)}
                      </Text>
                    </View>
                  )}
                </View>

                {payment.status === 'pending' && (
                  <TouchableOpacity
                    style={[
                      styles.payButton,
                      {
                        backgroundColor: colors.primary,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Trust Indicators */}
      <View style={styles.trustSection}>
        <View
          style={[
            styles.trustCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}>
          <Text style={[styles.trustTitle, {color: colors.textPrimary}]}>
            Secure Payments
          </Text>
          <Text style={[styles.trustText, {color: colors.textMuted}]}>
            All payments are processed securely through encrypted channels. Your financial information is protected.
          </Text>
        </View>
      </View>
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
  summarySection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.base,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  summaryCount: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  paymentsSection: {
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
  paymentCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadows.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  paymentHeaderLeft: {
    flex: 1,
    marginRight: Spacing.base,
  },
  paymentType: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  paymentDescription: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.base,
  },
  paymentBody: {
    gap: Spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentAmount: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  paymentDate: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  payButton: {
    marginTop: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  trustSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  trustCard: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  trustTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  trustText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
  },
});

export default PaymentsScreen;
