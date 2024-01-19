import Decimal from 'decimal.js'
import { calculateInterestByPeriod, calculateSchedule, createInitialPayment } from './AbstractLoanSchedule'
import { LSOptions, LSParameters, LSPayment } from './types'
import { addMonths, setDate } from 'date-fns'

export function generateBubblePayments(parameters: LSParameters, options?: LSOptions) {
	const fixedDecimal = options?.decimalDigit ?? 2
	const { issueDate, term, amount, rate, paymentOnDay } = parameters

	return Array.from<LSPayment>({ length: term }).reduce(
		(payments) => {
			const previousPayment = payments.at(-1)

			if (!previousPayment) throw new Error('Unexpected error in retrieving previous payment')

			const paymentDate = setDate(addMonths(previousPayment.paymentDate, 1), paymentOnDay)
			const initialBalance = previousPayment.finalBalance
			const principalAmount = payments.length === term ? initialBalance : new Decimal(0).toFixed(fixedDecimal)
			const interestAmount = new Decimal(
				calculateInterestByPeriod({
					from: previousPayment.paymentDate,
					to: paymentDate,
					amount: initialBalance,
					rate: new Decimal(rate).toFixed(fixedDecimal),
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
		[createInitialPayment(amount, issueDate, rate)] as LSPayment[],
	)
}

export function calculateBubbleLoanSchedule(parameters: LSParameters, options?: LSOptions) {
	return calculateSchedule(parameters, generateBubblePayments(parameters, options), options)
}
