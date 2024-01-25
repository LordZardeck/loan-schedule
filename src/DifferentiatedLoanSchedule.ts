import { calculateInterestByPeriod, calculateSchedule, createInitialPayment } from './AbstractLoanSchedule'
import { ScheduleOptions, ScheduleConfig, Payment } from './types'
import { addMonths, setDate, startOfDay } from 'date-fns'
import Decimal from 'decimal.js'

export function generateDifferentiatedPayments(parameters: ScheduleConfig, options?: ScheduleOptions) {
	const fixedDecimal = options?.decimalDigit ?? 2
	const { issueDate, termLength, amount, rate, paymentOnDay } = parameters

	const fixedPartOfPayment = new Decimal(amount).div(termLength).toFixed(fixedDecimal)
	return Array.from<Payment>({ length: termLength }).reduce(
		(payments) => {
			const previousPayment = payments.at(-1)

			if (!previousPayment) throw new Error('Unexpected error in retrieving previous payment')

			const paymentDate = setDate(addMonths(previousPayment.paymentDate, 1), paymentOnDay)
			const initialBalance = previousPayment.finalBalance
			const principalAmount = payments.length === termLength ? initialBalance : fixedPartOfPayment
			const interestAmount = new Decimal(
				calculateInterestByPeriod({
					from: previousPayment.paymentDate,
					to: paymentDate,
					amount: initialBalance,
					rate,
				}),
			).toFixed(fixedDecimal)

			return [
				...payments,
				{
					paymentDate,
					initialBalance,
					interestRate: rate,
					principalAmount,
					interestAmount,
					paymentAmount: new Decimal(principalAmount).plus(new Decimal(interestAmount)).toFixed(fixedDecimal),
					finalBalance: new Decimal(initialBalance).minus(new Decimal(principalAmount)).toFixed(fixedDecimal),
				},
			]
		},
		[createInitialPayment(amount, startOfDay(issueDate), rate)] as Payment[],
	)
}

export function calculateDifferentiatedLoanSchedule(parameters: ScheduleConfig, options?: ScheduleOptions) {
	return calculateSchedule(parameters, generateDifferentiatedPayments(parameters, options), options)
}
