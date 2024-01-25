import { InterestParameters, Payment, Schedule, ScheduleConfig, ScheduleOptions } from './types'
import {
	addDays,
	addMonths,
	differenceInDays,
	differenceInMonths,
	endOfMonth,
	isSameYear,
	setDate,
	startOfDay,
	startOfMonth,
} from 'date-fns'
import Decimal from 'decimal.js'

export function createInitialPayment(amount: Decimal.Value, paymentDate: Date, rate: Decimal.Value): Payment {
	return {
		paymentDate,
		initialBalance: new Decimal(0),
		paymentAmount: new Decimal(0),
		interestAmount: new Decimal(0),
		principalAmount: new Decimal(0),
		finalBalance: new Decimal(amount),
		interestRate: new Decimal(rate),
	}
}

export function getInterestByPeriod({ rate, to, from, amount }: InterestParameters) {
	return new Decimal(rate)
		.div(100)
		.div(to.getFullYear() % 4 === 0 ? 366 : 365)
		.mul(differenceInDays(to, from))
		.mul(amount)
}

export function getPaymentDate(issueDate: Date, scheduleMonth: number, paymentDay: number): Date {
	const paymentDate = addMonths(startOfMonth(startOfDay(issueDate)), scheduleMonth)
	const paymentEndOfMonth = endOfMonth(paymentDate)

	return setDate(
		paymentDate,
		// If the payment day is not available in the month, then use the last day of the month
		paymentEndOfMonth.getDate() < paymentDay ? paymentEndOfMonth.getDate() : paymentDay,
	)
}

export function getPaymentDateOnWorkingDay(paymentDate: Date, isHoliday?: (date: Date) => boolean): Date {
	let paymentDateOnWorkingDay = new Date(paymentDate)
	let amount = 1

	while (isHoliday?.(paymentDateOnWorkingDay)) {
		paymentDateOnWorkingDay = addDays(paymentDateOnWorkingDay, amount)

		if (paymentDateOnWorkingDay.getMonth() !== paymentDate.getMonth()) {
			amount = -1
			paymentDateOnWorkingDay = addDays(paymentDateOnWorkingDay, amount)
		}
	}

	return paymentDateOnWorkingDay
}

export function calculateInterestByPeriod(
	{ amount, rate, from, to }: InterestParameters,
	options?: ScheduleOptions,
): Decimal.Value {
	const fixedDecimal = options?.decimalDigit ?? 2

	if (isSameYear(from, to)) {
		return new Decimal(0)
			.plus(
				getInterestByPeriod({
					from,
					to,
					amount,
					rate,
				}),
			)
			.toFixed(fixedDecimal)
	}

	const endOfYear = new Date(from.getFullYear(), 11, 31)

	return new Decimal(0)
		.plus(
			getInterestByPeriod({
				from,
				to: endOfYear,
				amount,
				rate,
			}),
		)
		.plus(
			getInterestByPeriod({
				from: endOfYear,
				to,
				amount,
				rate,
			}),
		)
		.toFixed(fixedDecimal)
}

export function calculateSchedule<P extends Payment = Payment>(
	parameters: ScheduleConfig,
	schedulePayments: P[],
	options?: ScheduleOptions,
): Schedule<P> {
	const fixedDecimal = options?.decimalDigit ?? 2

	const initialPayment = schedulePayments.at(0)
	const firstPayment = schedulePayments.at(1)
	const lastPayment = schedulePayments.at(-1)

	if (initialPayment === undefined || firstPayment === undefined || lastPayment === undefined)
		throw new Error('There must exist at least two payments to apply final calculation')

	const [minPaymentAmount, maxPaymentAmount] = new Decimal(firstPayment.paymentAmount).lt(new Decimal(lastPayment.paymentAmount))
		? [new Decimal(firstPayment.paymentAmount).toFixed(fixedDecimal), new Decimal(lastPayment.paymentAmount).toFixed(fixedDecimal)]
		: [new Decimal(lastPayment.paymentAmount).toFixed(fixedDecimal), new Decimal(firstPayment.paymentAmount).toFixed(fixedDecimal)]

	const dateStart = setDate(startOfDay(initialPayment.paymentDate), 1)
	const dateEnd = setDate(startOfDay(lastPayment.paymentDate), 1)

	const termLength = differenceInMonths(dateEnd, dateStart)

	const amount = new Decimal(parameters.amount).toFixed(fixedDecimal)
	const overAllInterest = schedulePayments.reduce(
		(overAllInterest, pay) => new Decimal(overAllInterest).plus(pay.interestAmount).toFixed(fixedDecimal),
		new Decimal(0).toFixed(fixedDecimal),
	)

	const efficientRate = new Decimal(overAllInterest).div(amount).mul(100).toFixed(fixedDecimal)
	const fullAmount = new Decimal(overAllInterest).add(amount).toFixed(fixedDecimal)

	return {
		minPaymentAmount: new Decimal(minPaymentAmount).toNumber(),
		maxPaymentAmount: new Decimal(maxPaymentAmount).toNumber(),
		termLength,
		amount: new Decimal(amount).toNumber(),
		overAllInterest: new Decimal(overAllInterest).toNumber(),
		efficientRate: new Decimal(efficientRate).toNumber(),
		fullAmount: new Decimal(fullAmount).toNumber(),
		payments: schedulePayments,
	}
}

export function printSchedule(schedule: Schedule, printFunction: (message: string) => void) {
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
			pay.principalAmount +
			'\t|\t' +
			pay.interestAmount +
			'\t|\t' +
			pay.finalBalance,
		)
	})
}
