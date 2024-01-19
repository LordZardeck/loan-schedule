import Decimal from 'decimal.js'
import {
	calculateInterestByPeriod,
	calculateSchedule,
	createHolidayChecker,
	createInitialPayment,
	getPaymentDate,
	getPaymentDateOnWorkingDay,
} from './AbstractLoanSchedule'
import { Payment, PaymentType, Schedule, ScheduleConfig, ScheduleOptions } from './types'
import { isAfter, isSameDay, startOfDay } from 'date-fns'
import ProdCal from 'prod-cal'

export type AnnuityPayment = Payment & {
	annuityPaymentAmount: Decimal.Value
}

export function generateAnnuityPayments(parameters: ScheduleConfig, options?: ScheduleOptions) {
	const fixedDecimal = options?.decimalDigit ?? 2
	const isHoliday = options?.prodCalendar ? createHolidayChecker(new ProdCal(options.prodCalendar)) : () => false
	const { issueDate, term, amount, rate, paymentAmount, paymentOnDay, earlyRepayment = [] } = parameters
	let interestAccruedAmount = new Decimal(0)
	const regularPaymentAmount = new Decimal(
		paymentAmount ||
			calculateAnnuityPaymentAmount(
				{
					amount,
					term,
					rate,
				},
				{ decimalDigit: fixedDecimal },
			),
	)

	const payments: Array<AnnuityPayment> = [
		{
			...createInitialPayment(amount, startOfDay(issueDate), rate),
			annuityPaymentAmount: 0,
		},
	]

	const schedulePoints = Array.from(Array(term + 1).keys())
		.map(Number.call, Number)
		.map((termMonth) => ({
			paymentDate: getPaymentDateOnWorkingDay(
				termMonth === 0 ? startOfDay(issueDate) : getPaymentDate(issueDate, termMonth, paymentOnDay),
				isHoliday,
			),
			paymentType: PaymentType.ER_TYPE_REGULAR,
			paymentAmount: regularPaymentAmount,
		}))
		.concat(
			earlyRepayment.map(({ paymentDate, amount, type }) => ({
				paymentDate: getPaymentDateOnWorkingDay(paymentDate, isHoliday),
				paymentType: type,
				paymentAmount: new Decimal(amount),
			})),
		)
		.sort(({ paymentDate: leftPaymentDate }, { paymentDate: rightPaymentDate }) =>
			isSameDay(leftPaymentDate, rightPaymentDate) ? 0 : isAfter(leftPaymentDate, rightPaymentDate) ? 1 : -1,
		)

	let currentSchedulePoint = 1
	let scheduledPaymentAmount = new Decimal(schedulePoints[currentSchedulePoint].paymentAmount)

	while (
		currentSchedulePoint < schedulePoints.length &&
		new Decimal(payments[currentSchedulePoint - 1].finalBalance).gt(0)
	) {
		const pay: AnnuityPayment = {} as AnnuityPayment

		pay.paymentDate = schedulePoints[currentSchedulePoint].paymentDate
		pay.initialBalance = payments[currentSchedulePoint - 1].finalBalance
		pay.interestRate = new Decimal(rate).toFixed(fixedDecimal)
		pay.annuityPaymentAmount = calculateAnnuityPaymentAmount(
			{
				amount: pay.initialBalance,
				term: term - currentSchedulePoint + 1,
				rate: pay.interestRate,
			},
			{ decimalDigit: fixedDecimal },
		)

		if (schedulePoints[currentSchedulePoint].paymentType !== PaymentType.ER_TYPE_REGULAR) {
			scheduledPaymentAmount = new Decimal(schedulePoints[currentSchedulePoint].paymentAmount)
		} else if (schedulePoints[currentSchedulePoint - 1].paymentType !== PaymentType.ER_TYPE_REGULAR) {
			scheduledPaymentAmount = new Decimal(paymentAmount || pay.annuityPaymentAmount)
		}

		interestAccruedAmount = interestAccruedAmount.plus(
			calculateInterestByPeriod({
				from: payments[currentSchedulePoint - 1].paymentDate,
				to: pay.paymentDate,
				amount: pay.initialBalance,
				rate: pay.interestRate,
			}),
		)

		if (schedulePoints[currentSchedulePoint].paymentType === PaymentType.ER_TYPE_REGULAR) {
			if (currentSchedulePoint !== schedulePoints.length - 1 && scheduledPaymentAmount.lt(pay.initialBalance)) {
				if (interestAccruedAmount.gt(scheduledPaymentAmount)) {
					pay.interestAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
					interestAccruedAmount = interestAccruedAmount.minus(scheduledPaymentAmount)
				} else {
					pay.interestAmount = interestAccruedAmount.toFixed(fixedDecimal)
					interestAccruedAmount = new Decimal(0)
				}
				pay.principalAmount = new Decimal(scheduledPaymentAmount)
					.minus(new Decimal(pay.interestAmount))
					.toFixed(fixedDecimal)
				pay.paymentAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			} else {
				pay.interestAmount = interestAccruedAmount.toFixed(fixedDecimal)
				pay.principalAmount = pay.initialBalance
				pay.paymentAmount = new Decimal(pay.principalAmount)
					.plus(new Decimal(pay.interestAmount))
					.toFixed(fixedDecimal)
			}
		} else {
			pay.principalAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			pay.paymentAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			pay.interestAmount = new Decimal(0).toFixed(fixedDecimal)
		}

		pay.finalBalance = new Decimal(pay.initialBalance).minus(new Decimal(pay.principalAmount)).toFixed(fixedDecimal)

		payments.push(pay)
		currentSchedulePoint++
	}

	return payments
}

export function printAnnuitySchedule(schedule: Schedule<AnnuityPayment>, printFunction: (message: string) => void) {
	const pf = printFunction || console.log

	pf('Payment = {' + schedule.minPaymentAmount + ', ' + schedule.maxPaymentAmount + '}, Term = ' + schedule.term)
	pf('OverallInterest = ' + schedule.overAllInterest + ' , EfficientRate = ' + schedule.efficientRate)

	schedule.payments?.forEach((pay) => {
		pf(
			pay.paymentDate +
				'\t|\t' +
				pay.initialBalance +
				'\t|\t' +
				pay.paymentAmount +
				'\t|\t' +
				pay.annuityPaymentAmount +
				'\t|\t' +
				pay.principalAmount +
				'\t|\t' +
				pay.interestAmount +
				'\t|\t' +
				pay.finalBalance,
		)
	})
}

export function calculateAnnuityLoanSchedule(parameters: ScheduleConfig, options?: ScheduleOptions) {
	return calculateSchedule(parameters, generateAnnuityPayments(parameters, options), options)
}

export function calculateAnnuityPaymentAmount(
	parameters: Required<Pick<ScheduleConfig, 'term' | 'rate' | 'amount'>>,
	options?: ScheduleOptions,
): Decimal.Value {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = new Decimal(parameters.term)
	const interestRate = new Decimal(parameters.rate).div(100).div(12)

	return new Decimal(parameters.amount)
		.mul(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1)))
		.toFixed(fixedDecimal)
}

export function calculateMaxLoanAmount(
	parameters: Required<Pick<ScheduleConfig, 'term' | 'rate' | 'paymentAmount'>>,
	options?: ScheduleOptions,
): Decimal.Value {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = new Decimal(parameters.term)
	const interestRate = new Decimal(parameters.rate).div(100).div(12)
	const paymentAmount = new Decimal(parameters.paymentAmount)

	return paymentAmount.div(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1))).toFixed(fixedDecimal)
}
