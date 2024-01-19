# Library for loan amortization schedule manipulation

[![codecov](https://codecov.io/gh/lordzardeck/loan-schedule/branch/master/graph/badge.svg)](https://codecov.io/gh/lordzardeck/loan-schedule)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/c7e72328deea4876b950a4c7229297be)](https://app.codacy.com/gh/LordZardeck/loan-schedule/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![version](https://img.shields.io/npm/v/loan-schedule.svg)](https://www.npmjs.com/package/loan-schedule)
[![license](https://img.shields.io/npm/l/loan-schedule.svg)](https://www.npmjs.com/package/loan-schedule)

[..::Live demo::..](https://timmson.github.io/loan-schedule-ui/)

## Install
```sh
npm i loan-schedule.js
```

## Init
```js
const LoanSchedule = require("loan-schedule.js");

const loanSchedule = new LoanSchedule({});
```

## Init with options
```js
const LoanSchedule = require("loan-schedule.js");

const loanSchedule = new LoanSchedule({
    DecimalDigit : 2,
    dateFormat: "DD.MM.YYYY",
    prodCalendar: "ru"
});
```

## Interest by period
```js
let interest = loanSchedule.calculateInterestByPeriod({
                   from: "10.12.2015", 
                   to: "10.01.2016", 
                   amount: 1000, 
                   rate: 16.7
});
console.log(interest);
```

## Payment
```js
let payment = loanSchedule.calculateAnnuityPaymentAmount({
                  amount: 110000, 
                  term: 60, 
                  rate: 12.9
});
console.log(payment);
```

## Max Loan Amount
```js
let loanAmount = loanSchedule.calculateMaxLoanAmount({
                  paymentAmount: 2497.21,
                  term: 60,
                  rate: 12.9
});
console.log(loanAmount);
```

## Annuity loan schedule (payment amount will be calculated)
```js
loanSchedule.calculateSchedule({
                   amount: 50000,
                   rate: 11.5,
                   term: 12,
                   paymentOnDay: 25,
                   issueDate: "25.10.2016",
                   scheduleType : LoanSchedule.ANNUITY_SCHEDULE
}).payments.forEach((pay) => {
    console.log(pay.paymentDate + "\t|\t\t"
     + pay.initialBalance + "\t|\t\t"
     + pay.paymentAmount + "\t|\t\t"
     + pay.principalAmount + "\t|\t\t"
     + pay.interestAmount + "\t|\t\t"
     + pay.finalBalance
     );
});
```

## Annuity loan schedule (payment amount is set)
```js
loanSchedule.calculateSchedule({
                   amount: 50000,
                   rate: 11.5,
                   term: 12,
                   paymentAmount: 40000,
                   paymentOnDay: 25,
                   issueDate: "25.10.2016",
                   scheduleType : LoanSchedule.ANNUITY_SCHEDULE
}).payments.forEach((pay) => {
    console.log(pay.paymentDate + "\t|\t\t"
     + pay.initialBalance + "\t|\t\t"
     + pay.paymentAmount + "\t|\t\t"
     + pay.principalAmount + "\t|\t\t"
     + pay.interestAmount + "\t|\t\t"
     + pay.finalBalance
     );
});
```

## Differentiated loan schedule
```js
loanSchedule.calculateSchedule({
                   amount: 50000,
                   rate: 11.5,
                   term: 12,
                   paymentOnDay: 25,
                   issueDate: "25.10.2016",
                   scheduleType : LoanSchedule.DIFFERENTIATED_SCHEDULE
}).payments.forEach((pay) => {
    console.log(pay.paymentDate + "\t|\t\t"
     + pay.initialBalance + "\t|\t\t"
     + pay.paymentAmount + "\t|\t\t"
     + pay.principalAmount + "\t|\t\t"
     + pay.interestAmount + "\t|\t\t"
     + pay.finalBalance
     );
});
```

## Bubble loan schedule
```js
loanSchedule.calculateSchedule({
                   amount: 50000,
                   rate: 11.5,
                   term: 12,
                   paymentOnDay: 25,
                   issueDate: "25.10.2016",
                   scheduleType : LoanSchedule.BUUBLE_SCHEDULE
}).payments.forEach((pay) => {
    console.log(pay.paymentDate + "\t|\t\t"
     + pay.initialBalance + "\t|\t\t"
     + pay.paymentAmount + "\t|\t\t"
     + pay.principalAmount + "\t|\t\t"
     + pay.interestAmount + "\t|\t\t"
     + pay.finalBalance
     );
});
```
