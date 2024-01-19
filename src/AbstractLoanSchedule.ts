import Decimal from 'decimal.js'
import ProdCal from 'prod-cal'
import {
	LSInterestByPeriodParameters,
	LSInterestParameters,
	LSOptions,
	LSParameters,
	LSPayment,
	LSSchedule,
	PaymentType,
} from './types'
import {
	differenceInDays,
	differenceInMonths,
	isSameYear,
	setDate,
	startOfMonth,
	addMonths,
	endOfMonth,
	addDays,
} from 'date-fns'

export abstract class AbstractLoanSchedule<Payment extends LSPayment = LSPayment> {
	decimal = 2
	prodCalendar: ProdCal | null = null

	constructor(options?: LSOptions) {
		if (options) {
			this.decimal = options.decimalDigit || this.decimal
			// TODO: Remove prod calendar
			if (options.prodCalendar) this.prodCalendar = new ProdCal(options.prodCalendar)
		}
	}

	abstract generatePayments(parameters: LSParameters): Payment[]

	calculateSchedule(parameters: LSParameters, payments?: Payment[]): LSSchedule<Payment> {
		const schedulePayments = payments ?? this.generatePayments(parameters)

		const initialPayment = schedulePayments.at(0)
		const firstPayment = schedulePayments.at(1)
		const lastPayment = schedulePayments.at(-1)

		if (initialPayment === undefined || firstPayment === undefined || lastPayment === undefined)
			throw new Error('There must exist at least two payments to apply final calculation')

		const minPaymentAmount = Decimal.min(firstPayment.paymentAmount, lastPayment.paymentAmount).toFixed(
			this.decimal,
		)
		const maxPaymentAmount = Decimal.max(firstPayment.paymentAmount, lastPayment.paymentAmount).toFixed(
			this.decimal,
		)

		const dateStart = setDate(initialPayment.paymentDate, 1)
		const dateEnd = setDate(lastPayment.paymentDate, 1)

		// TODO: Validate that the difference in months is rounded correctly. Currently it is truncated.
		const term = differenceInMonths(dateEnd, dateStart)

		const amount = new Decimal(parameters.amount).toFixed(this.decimal)
		const overAllInterest = schedulePayments.reduce(
			(overAllInterest, pay) => new Decimal(overAllInterest).plus(pay.interestAmount).toFixed(this.decimal),
			new Decimal(0).toFixed(this.decimal),
		)

		const efficientRate = new Decimal(overAllInterest).div(amount).mul(100).toFixed(this.decimal)
		const fullAmount = new Decimal(overAllInterest).add(amount).toFixed(this.decimal)

		return {
			minPaymentAmount,
			maxPaymentAmount,
			term,
			amount,
			overAllInterest,
			efficientRate,
			fullAmount,
			payments: schedulePayments,
		}
	}

	getInitialPayment(amount: Decimal.Value, paymentDate: Date, rate: Decimal.Value): LSPayment {
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

	calculateInterestByPeriod({ amount, rate, from, to }: LSInterestParameters): Decimal.Value {
		if (isSameYear(from, to)) {
			return new Decimal(0)
				.plus(
					this.getInterestByPeriod({
						from,
						to,
						amount,
						rate,
					}),
				)
				.toFixed(this.decimal)
		}

		const endOfYear = new Date(from.getFullYear(), 11, 31)

		return new Decimal(0)
			.plus(
				this.getInterestByPeriod({
					from,
					to: endOfYear,
					amount,
					rate,
				}),
			)
			.plus(
				this.getInterestByPeriod({
					from: endOfYear,
					to,
					amount,
					rate,
				}),
			)
			.toFixed(this.decimal)
	}

	getInterestByPeriod({ rate, to, from, amount }: LSInterestByPeriodParameters): Decimal {
		return new Decimal(rate)
			.div(100)
			.div(to.getFullYear() % 4 === 0 ? 366 : 365)
			.mul(differenceInDays(to, from))
			.mul(amount)
	}

	addMonths(number: number, date: Date, paymentOnDay: number): Date {
		const paymentDate = addMonths(startOfMonth(date), number)
		const paymentEndOfMonth = endOfMonth(paymentDate)

		return setDate(
			paymentDate,
			paymentEndOfMonth.getDate() < paymentOnDay ? paymentEndOfMonth.getDate() : paymentOnDay,
		)
	}

	isHoliday(date: Date): boolean {
		return (
			this.prodCalendar?.getDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) === ProdCal.DAY_HOLIDAY
		)
	}

	getSchedulePoint(paymentDate: Date, paymentType: PaymentType, paymentAmount: Decimal.Value) {
		paymentDate = this.getPaymentDateOnWorkingDay(paymentDate)
		return { paymentDate, paymentType, paymentAmount }
	}

	getPaymentDateOnWorkingDay(paymentDate: Date): Date {
		let paymentDateOnWorkingDay = new Date(paymentDate)
		let amount = 1

		while (this.isHoliday(paymentDateOnWorkingDay)) {
			paymentDateOnWorkingDay = addDays(paymentDateOnWorkingDay, amount)

			if (paymentDateOnWorkingDay.getMonth() !== paymentDate.getMonth()) {
				amount = -1
				paymentDateOnWorkingDay = addDays(paymentDateOnWorkingDay, amount)
			}
		}

		return paymentDateOnWorkingDay
	}

	printSchedule(schedule: LSSchedule, printFunction: (message: string) => void) {
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
					pay.principalAmount +
					'\t|\t' +
					pay.interestAmount +
					'\t|\t' +
					pay.finalBalance,
			)
		})
	}
}
