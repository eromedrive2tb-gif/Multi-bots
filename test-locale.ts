const amount = 700;
const amountFormatted = (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});
console.log('Amount:', amount);
console.log('Formatted:', amountFormatted);
