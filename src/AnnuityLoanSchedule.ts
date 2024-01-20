import Decimal from 'decimal.js'
import {
	calculateInterestByPeriod,
	calculateSchedule,
	createHolidayChecker,
	createInitialPayment,
	getPaymentDate,
	getPaymentDateOnWorkingDay,
} from './AbstractLoanSchedule'
import { Payment, PaymentType, Schedule, ScheduleConfig, ScheduleOptions, SchedulePoint } from './types'
import { startOfDay } from 'date-fns'
import ProdCal from 'prod-cal'

export type AnnuityPayment = Payment & {
	annuityPaymentAmount: Decimal.Value
}

export type SchedulePlan = {
	issueDate: Date
	paymentOnDay: number
	termLength: number
	regularPaymentAmount: Decimal.Value
	earlyRepayments: SchedulePoint[]
}

export function generateAnnuitySchedulePoints(plan: SchedulePlan, options?: ScheduleOptions): SchedulePoint[] {
	const { regularPaymentAmount, earlyRepayments, issueDate, paymentOnDay, termLength } = plan
	const isHoliday = options?.prodCalendar ? createHolidayChecker(new ProdCal(options.prodCalendar)) : () => false

	return Array.from(Array(termLength + 1).keys())
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
			earlyRepayments.map(({ paymentDate, ...schedulePoint }) => ({
				paymentDate: getPaymentDateOnWorkingDay(paymentDate, isHoliday),
				...schedulePoint,
			})),
		)
		.sort(
			({ paymentDate: leftPaymentDate }, { paymentDate: rightPaymentDate }) =>
				leftPaymentDate.getTime() - rightPaymentDate.getTime(),
		)
}

export type PaymentGeneratorConfig = {
	issueDate: Date
	termLength: number
	amount: Decimal.Value
	rate: Decimal.Value
	paymentAmount?: Decimal.Value
}

export type PaymentGeneratorConfigWithSchedulePoints = PaymentGeneratorConfig & {
	schedulePoints: SchedulePoint[]
}

export type PaymentGeneratorConfigWithoutSchedulePoints = PaymentGeneratorConfig & {
	paymentOnDay: number
	earlyRepayments?: SchedulePoint[]
}

export type AnnuityPaymentsParameters =
	| PaymentGeneratorConfigWithSchedulePoints
	| PaymentGeneratorConfigWithoutSchedulePoints

export function generateAnnuityPayments(parameters: AnnuityPaymentsParameters, options?: ScheduleOptions) {
	const fixedDecimal = options?.decimalDigit ?? 2
	const { issueDate, termLength, amount, rate, paymentAmount } = parameters
	let interestAccruedAmount = new Decimal(0)

	const payments: Array<AnnuityPayment> = [
		{
			...createInitialPayment(amount, startOfDay(issueDate), rate),
			annuityPaymentAmount: 0,
		},
	]

	const schedulePoints =
		'schedulePoints' in parameters
			? parameters.schedulePoints
			: generateAnnuitySchedulePoints(
					{
						paymentOnDay: parameters.paymentOnDay,
						earlyRepayments: parameters.earlyRepayments ?? [],
						termLength,
						issueDate,
						regularPaymentAmount: new Decimal(
							paymentAmount ||
								calculateAnnuityPaymentAmount(
									{
										amount,
										termLength,
										rate,
									},
									{ decimalDigit: fixedDecimal },
								),
						),
					},
					options,
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
				termLength: termLength - currentSchedulePoint + 1,
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

	pf(
		'Payment = {' +
			schedule.minPaymentAmount +
			', ' +
			schedule.maxPaymentAmount +
			'}, Term = ' +
			schedule.termLength,
	)
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
	parameters: Required<Pick<ScheduleConfig, 'termLength' | 'rate' | 'amount'>>,
	options?: ScheduleOptions,
): Decimal.Value {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = new Decimal(parameters.termLength)
	const interestRate = new Decimal(parameters.rate).div(100).div(12)

	return new Decimal(parameters.amount)
		.mul(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1)))
		.toFixed(fixedDecimal)
}

export function calculateMaxLoanAmount(
	parameters: Required<Pick<ScheduleConfig, 'termLength' | 'rate' | 'paymentAmount'>>,
	options?: ScheduleOptions,
): Decimal.Value {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = new Decimal(parameters.termLength)
	const interestRate = new Decimal(parameters.rate).div(100).div(12)
	const paymentAmount = new Decimal(parameters.paymentAmount)

	return paymentAmount.div(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1))).toFixed(fixedDecimal)
}
