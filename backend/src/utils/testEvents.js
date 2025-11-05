// Test script to simulate system events for WebSocket testing
const systemEvents = require('./eventEmitter');

function simulateEvents() {
    console.log('🎬 Starting event simulation...\n');
    
    let counter = 0;

    // Simulate NEW_USER event every 8 seconds
    setInterval(() => {
        counter++;
        systemEvents.emitNewUser({
            userId: `user_${counter}`,
            email: `testuser${counter}@example.com`,
            name: `Test User ${counter}`
        });
        console.log(`✅ Emitted NEW_USER event #${counter}`);
    }, 8000);

    // Simulate CARD_REGISTERED event every 12 seconds
    setInterval(() => {
        counter++;
        systemEvents.emitCardRegistered({
            cardId: `card_${counter}`,
            userId: `user_${Math.floor(Math.random() * 10) + 1}`,
            balance: 0,
            registrationFee: 50
        });
        console.log(`✅ Emitted CARD_REGISTERED event #${counter}`);
    }, 12000);

    // Simulate CARD_RECHARGED event every 10 seconds
    setInterval(() => {
        counter++;
        systemEvents.emitCardRecharged({
            cardId: `card_${Math.floor(Math.random() * 5) + 1}`,
            amount: [100, 200, 500, 1000][Math.floor(Math.random() * 4)],
            newBalance: Math.floor(Math.random() * 2000) + 100
        });
        console.log(`✅ Emitted CARD_RECHARGED event #${counter}`);
    }, 10000);

    // Simulate TICKET_BOOKED event every 7 seconds
    setInterval(() => {
        counter++;
        const stations = [
            { id: 1, name: 'Rajiv Chowk' },
            { id: 2, name: 'Kashmere Gate' },
            { id: 3, name: 'New Delhi' },
            { id: 4, name: 'Anand Vihar' },
            { id: 5, name: 'Dwarka Sector 21' }
        ];
        const from = stations[Math.floor(Math.random() * stations.length)];
        const to = stations[Math.floor(Math.random() * stations.length)];
        
        systemEvents.emitTicketBooked({
            ticketId: `ticket_${counter}`,
            userId: `user_${Math.floor(Math.random() * 10) + 1}`,
            fromStation: from.name,
            toStation: to.name,
            fare: Math.floor(Math.random() * 60) + 20,
            ticketType: Math.random() > 0.5 ? 'QR' : 'Token'
        });
        console.log(`✅ Emitted TICKET_BOOKED event #${counter}`);
    }, 7000);

    // Simulate JOURNEY_ENTRY event every 9 seconds
    setInterval(() => {
        counter++;
        const stations = ['Rajiv Chowk', 'Kashmere Gate', 'New Delhi', 'Anand Vihar', 'Dwarka Sector 21'];
        
        systemEvents.emitJourneyEntry({
            journeyId: `journey_${counter}`,
            cardId: `card_${Math.floor(Math.random() * 5) + 1}`,
            entryStation: stations[Math.floor(Math.random() * stations.length)],
            entryTime: new Date().toISOString()
        });
        console.log(`✅ Emitted JOURNEY_ENTRY event #${counter}`);
    }, 9000);

    // Simulate JOURNEY_EXIT event every 15 seconds
    setInterval(() => {
        counter++;
        const stations = ['Rajiv Chowk', 'Kashmere Gate', 'New Delhi', 'Anand Vihar', 'Dwarka Sector 21'];
        
        systemEvents.emitJourneyExit({
            journeyId: `journey_${Math.floor(Math.random() * 10) + 1}`,
            cardId: `card_${Math.floor(Math.random() * 5) + 1}`,
            exitStation: stations[Math.floor(Math.random() * stations.length)],
            fare: Math.floor(Math.random() * 60) + 20,
            duration: `${Math.floor(Math.random() * 60) + 10} minutes`
        });
        console.log(`✅ Emitted JOURNEY_EXIT event #${counter}`);
    }, 15000);

    console.log('📡 Event simulator is running...');
    console.log('🎯 Events will be emitted at different intervals');
    console.log('⏱️  NEW_USER: every 8s | TICKET: every 7s | CARD_REG: every 12s');
    console.log('⏱️  CARD_RECHARGE: every 10s | JOURNEY_IN: every 9s | JOURNEY_OUT: every 15s\n');
}

module.exports = { simulateEvents };
