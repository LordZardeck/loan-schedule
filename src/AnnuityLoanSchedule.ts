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
import { Big, BigSource } from 'big.js'

export type AnnuityPayment = Payment & {
	annuityPaymentAmount: BigSource
}

export type SchedulePlan = {
	issueDate: Date
	paymentOnDay: number
	termLength: number
	regularPaymentAmount: BigSource
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
	amount: BigSource
	rate: BigSource
	paymentAmount?: BigSource
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
	let interestAccruedAmount = Big(0)

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
						regularPaymentAmount: Big(
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
	let scheduledPaymentAmount = Big(schedulePoints[currentSchedulePoint].paymentAmount)

	while (currentSchedulePoint < schedulePoints.length && Big(payments[currentSchedulePoint - 1].finalBalance).gt(0)) {
		const pay: AnnuityPayment = {} as AnnuityPayment

		pay.paymentDate = schedulePoints[currentSchedulePoint].paymentDate
		pay.initialBalance = payments[currentSchedulePoint - 1].finalBalance
		pay.interestRate = Big(rate).toFixed(fixedDecimal)
		pay.annuityPaymentAmount = calculateAnnuityPaymentAmount(
			{
				amount: pay.initialBalance,
				termLength: termLength - currentSchedulePoint + 1,
				rate: pay.interestRate,
			},
			{ decimalDigit: fixedDecimal },
		)

		if (schedulePoints[currentSchedulePoint].paymentType !== PaymentType.ER_TYPE_REGULAR) {
			scheduledPaymentAmount = Big(schedulePoints[currentSchedulePoint].paymentAmount)
		} else if (schedulePoints[currentSchedulePoint - 1].paymentType !== PaymentType.ER_TYPE_REGULAR) {
			scheduledPaymentAmount = Big(paymentAmount || pay.annuityPaymentAmount)
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
					interestAccruedAmount = Big(0)
				}
				pay.principalAmount = Big(scheduledPaymentAmount).minus(Big(pay.interestAmount)).toFixed(fixedDecimal)
				pay.paymentAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			} else {
				pay.interestAmount = interestAccruedAmount.toFixed(fixedDecimal)
				pay.principalAmount = pay.initialBalance
				pay.paymentAmount = Big(pay.principalAmount).plus(Big(pay.interestAmount)).toFixed(fixedDecimal)
			}
		} else {
			pay.principalAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			pay.paymentAmount = scheduledPaymentAmount.toFixed(fixedDecimal)
			pay.interestAmount = Big(0).toFixed(fixedDecimal)
		}

		pay.finalBalance = Big(pay.initialBalance).minus(Big(pay.principalAmount)).toFixed(fixedDecimal)

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
): BigSource {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = Big(parameters.termLength)
	const interestRate = Big(parameters.rate).div(100).div(12)

	const multiplier = interestRate.plus(1).pow(term.neg().toNumber()).neg().plus(1)

	if (multiplier.eq(0)) return Infinity

	return Big(parameters.amount)
		.mul(interestRate.div(interestRate.plus(1).pow(term.neg().toNumber()).neg().plus(1)))
		.round(fixedDecimal)
}

export function calculateMaxLoanAmount(
	parameters: Required<Pick<ScheduleConfig, 'termLength' | 'rate' | 'paymentAmount'>>,
	options?: ScheduleOptions,
): BigSource {
	const fixedDecimal = options?.decimalDigit ?? 2
	const term = Big(parameters.termLength)
	const interestRate = Big(parameters.rate).div(100).div(12)
	const paymentAmount = Big(parameters.paymentAmount)

	return paymentAmount
		.div(interestRate.div(interestRate.plus(1).pow(term.neg().toNumber()).neg().plus(1)))
		.toFixed(fixedDecimal)
}
