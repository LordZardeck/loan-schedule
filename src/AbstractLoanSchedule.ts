import { Big, BigSource } from 'big.js'
import ProdCal from 'prod-cal'
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

export function createInitialPayment(amount: BigSource, paymentDate: Date, rate: BigSource): Payment {
	return {
		paymentDate,
		initialBalance: new Big(0),
		paymentAmount: new Big(0),
		interestAmount: new Big(0),
		principalAmount: new Big(0),
		finalBalance: new Big(amount),
		interestRate: new Big(rate),
	}
}

export function getInterestByPeriod({ rate, to, from, amount }: InterestParameters) {
	return new Big(rate)
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

export function createHolidayChecker(prodCalendar: ProdCal) {
	return (date: Date): boolean =>
		prodCalendar.getDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) === ProdCal.DAY_HOLIDAY
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
): BigSource {
	const fixedDecimal = options?.decimalDigit ?? 2

	if (isSameYear(from, to)) {
		return new Big(0)
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

	return new Big(0)
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

	const [minPaymentAmount, maxPaymentAmount] = Big(firstPayment.paymentAmount).lt(Big(lastPayment.paymentAmount))
		? [Big(firstPayment.paymentAmount).round(fixedDecimal), Big(lastPayment.paymentAmount).round(fixedDecimal)]
		: [Big(lastPayment.paymentAmount).round(fixedDecimal), Big(firstPayment.paymentAmount).round(fixedDecimal)]

	const dateStart = setDate(startOfDay(initialPayment.paymentDate), 1)
	const dateEnd = setDate(startOfDay(lastPayment.paymentDate), 1)

	const termLength = differenceInMonths(dateEnd, dateStart)

	const amount = Big(parameters.amount).round(fixedDecimal)
	const overAllInterest = schedulePayments.reduce(
		(overAllInterest, pay) => overAllInterest.plus(pay.interestAmount).round(fixedDecimal),
		Big(0).round(fixedDecimal),
	)

	const efficientRate = Big(overAllInterest).div(amount).mul(100).round(fixedDecimal)
	const fullAmount = Big(overAllInterest).add(amount).round(fixedDecimal)

	return {
		minPaymentAmount: Big(minPaymentAmount).toNumber(),
		maxPaymentAmount: Big(maxPaymentAmount).toNumber(),
		termLength,
		amount: Big(amount).toNumber(),
		overAllInterest: Big(overAllInterest).toNumber(),
		efficientRate: Big(efficientRate).toNumber(),
		fullAmount: Big(fullAmount).toNumber(),
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
