import Decimal from 'decimal.js'
import { AbstractLoanSchedule } from './AbstractLoanSchedule'
import { LSInterestParameters, LSOptions, LSParameters, LSPayment, LSSchedule, PaymentType } from './types'
import { isAfter, isSameDay } from 'date-fns'

type AnnuityPayment = LSPayment & {
	annuityPaymentAmount: Decimal.Value
}

export class AnnuityLoanSchedule extends AbstractLoanSchedule<AnnuityPayment> {
	printSchedule(schedule: LSSchedule<AnnuityPayment>, printFunction: (message: string) => void) {
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

	generatePayments(parameters: LSParameters) {
		const { issueDate, term, amount, rate, paymentAmount, paymentOnDay, earlyRepayment = [] } = parameters
		let interestAccruedAmount = new Decimal(0)
		const regularPaymentAmount = new Decimal(
			paymentAmount ||
				this.calculateAnnuityPaymentAmount({
					amount,
					term,
					rate,
				}),
		)

		const payments: Array<AnnuityPayment> = [
			{
				...this.getInitialPayment(amount, issueDate, rate),
				annuityPaymentAmount: 0,
			},
		]

		const schedulePoints = Array.from(Array(term + 1).keys())
			.map(Number.call, Number)
			.map((termMonth) =>
				this.getSchedulePoint(
					termMonth === 0 ? new Date(issueDate) : this.addMonths(termMonth, issueDate, paymentOnDay),
					PaymentType.ER_TYPE_REGULAR,
					regularPaymentAmount,
				),
			)
			.concat(
				earlyRepayment.map(({ paymentDate, amount, type }) => this.getSchedulePoint(paymentDate, type, amount)),
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
			pay.interestRate = new Decimal(rate).toFixed(this.decimal)
			pay.annuityPaymentAmount = this.calculateAnnuityPaymentAmount({
				amount: pay.initialBalance,
				term: term - currentSchedulePoint + 1,
				rate: pay.interestRate,
			})

			if (schedulePoints[currentSchedulePoint].paymentType !== PaymentType.ER_TYPE_REGULAR) {
				scheduledPaymentAmount = new Decimal(schedulePoints[currentSchedulePoint].paymentAmount)
			} else if (schedulePoints[currentSchedulePoint - 1].paymentType !== PaymentType.ER_TYPE_REGULAR) {
				scheduledPaymentAmount = new Decimal(paymentAmount || pay.annuityPaymentAmount)
			}

			interestAccruedAmount = interestAccruedAmount.plus(
				this.calculateInterestByPeriod({
					from: payments[currentSchedulePoint - 1].paymentDate,
					to: pay.paymentDate,
					amount: pay.initialBalance,
					rate: pay.interestRate,
				}),
			)

			if (schedulePoints[currentSchedulePoint].paymentType === PaymentType.ER_TYPE_REGULAR) {
				if (
					currentSchedulePoint !== schedulePoints.length - 1 &&
					scheduledPaymentAmount.lt(pay.initialBalance)
				) {
					if (interestAccruedAmount.gt(scheduledPaymentAmount)) {
						pay.interestAmount = scheduledPaymentAmount.toFixed(this.decimal)
						interestAccruedAmount = interestAccruedAmount.minus(scheduledPaymentAmount)
					} else {
						pay.interestAmount = interestAccruedAmount.toFixed(this.decimal)
						interestAccruedAmount = new Decimal(0)
					}
					pay.principalAmount = new Decimal(scheduledPaymentAmount)
						.minus(new Decimal(pay.interestAmount))
						.toFixed(this.decimal)
					pay.paymentAmount = scheduledPaymentAmount.toFixed(this.decimal)
				} else {
					pay.interestAmount = interestAccruedAmount.toFixed(this.decimal)
					pay.principalAmount = pay.initialBalance
					pay.paymentAmount = new Decimal(pay.principalAmount)
						.plus(new Decimal(pay.interestAmount))
						.toFixed(this.decimal)
				}
			} else {
				pay.principalAmount = scheduledPaymentAmount.toFixed(this.decimal)
				pay.paymentAmount = scheduledPaymentAmount.toFixed(this.decimal)
				pay.interestAmount = new Decimal(0).toFixed(this.decimal)
			}

			pay.finalBalance = new Decimal(pay.initialBalance)
				.minus(new Decimal(pay.principalAmount))
				.toFixed(this.decimal)

			payments.push(pay)
			currentSchedulePoint++
		}

		return payments
	}

	calculateMaxLoanAmount(parameters: Required<Pick<LSParameters, 'term' | 'rate' | 'paymentAmount'>>): Decimal.Value {
		const term = new Decimal(parameters.term)
		const interestRate = new Decimal(parameters.rate).div(100).div(12)
		const paymentAmount = new Decimal(parameters.paymentAmount)

		return paymentAmount
			.div(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1)))
			.toFixed(this.decimal)
	}

	calculateAnnuityPaymentAmount(parameters: Required<Pick<LSParameters, 'term' | 'rate' | 'amount'>>): Decimal.Value {
		const term = new Decimal(parameters.term)
		const interestRate = new Decimal(parameters.rate).div(100).div(12)

		return new Decimal(parameters.amount)
			.mul(interestRate.div(interestRate.plus(1).pow(term.neg()).neg().plus(1)))
			.toFixed(this.decimal)
	}
}

export function calculateAnnuityLoanSchedule(parameters: LSParameters, options?: LSOptions) {
	return new AnnuityLoanSchedule(options).calculateSchedule(parameters)
}

export function calculateInterestByPeriod(parameters: LSInterestParameters, options?: LSOptions): Decimal.Value {
	return new AnnuityLoanSchedule(options).calculateInterestByPeriod(parameters)
}

export function calculateAnnuityPaymentAmount(
	parameters: Required<Pick<LSParameters, 'term' | 'rate' | 'amount'>>,
	options?: LSOptions,
): Decimal.Value {
	return new AnnuityLoanSchedule(options).calculateAnnuityPaymentAmount(parameters)
}

export function calculateMaxLoanAmount(
	parameters: Required<Pick<LSParameters, 'term' | 'rate' | 'paymentAmount'>>,
	options?: LSOptions,
): Decimal.Value {
	return new AnnuityLoanSchedule(options).calculateMaxLoanAmount(parameters)
}
