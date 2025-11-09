#!/usr/bin/env node

/**
 * Terminal-based Live Logger for Delhi Metro System
 * Connects to WebSocket endpoint and displays real-time events
 * 
 * Usage: node live-logger-terminal.js <JWT_TOKEN>
 */

const WebSocket = require('ws');
const readline = require('readline');

// ANSI color codes for beautiful terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// Event type colors and icons
const eventConfig = {
  'NEW_USER': { color: colors.green, icon: '👤', label: 'NEW USER' },
  'TICKET_BOOKED': { color: colors.blue, icon: '🎫', label: 'TICKET' },
  'CARD_REGISTERED': { color: colors.magenta, icon: '💳', label: 'CARD REG' },
  'CARD_RECHARGED': { color: colors.cyan, icon: '💰', label: 'RECHARGE' },
  'JOURNEY_ENTRY': { color: colors.yellow, icon: '🚪', label: 'ENTRY' },
  'JOURNEY_EXIT': { color: colors.red, icon: '🚪', label: 'EXIT' },
};

// Helper function to format JSON data
function formatData(data) {
  return JSON.stringify(data, null, 2)
    .split('\n')
    .map(line => `    ${colors.dim}${line}${colors.reset}`)
    .join('\n');
}

// Helper function to format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return `${colors.dim}${date.toLocaleTimeString()}${colors.reset}`;
}

// Display event in the terminal
function displayEvent(message) {
  try {
    const event = JSON.parse(message);
    
    if (event.error) {
      console.log(`\n${colors.red}${colors.bright}❌ ERROR:${colors.reset} ${event.message}\n`);
      return;
    }
    
    if (event.success && !event.event) {
      console.log(`\n${colors.green}${colors.bright}✅ ${event.message}${colors.reset}\n`);
      return;
    }
    
    if (event.event) {
      const config = eventConfig[event.event] || { color: colors.white, icon: '📋', label: event.event };
      const time = formatTime(event.timestamp);
      
      console.log(`\n${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(`${config.color}${config.icon}  ${config.label}${colors.reset} ${time}`);
      console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(formatData(event.data));
    }
  } catch (error) {
    console.log(`${colors.dim}${message}${colors.reset}`);
  }
}

// Print header
function printHeader() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚇  DELHI METRO LIVE LOGGING SYSTEM  🚇                   ║
║                                                               ║
║     Real-time Event Monitoring Terminal                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}
`);
}

// Main function
function main() {
  printHeader();
  
  // Get token from command line argument or use default test token
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`${colors.yellow}⚠️  No JWT token provided!${colors.reset}\n`);
    console.log(`${colors.bright}Usage:${colors.reset}`);
    console.log(`  node live-logger-terminal.js <JWT_TOKEN>\n`);
    console.log(`${colors.bright}Example:${colors.reset}`);
    console.log(`  node live-logger-terminal.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n`);
    console.log(`${colors.dim}Hint: Get your token by logging in via POST /api/auth/login${colors.reset}\n`);
    console.log(`${colors.yellow}📝 You can also run the event simulator to see test events:${colors.reset}`);
    console.log(`   curl -X POST http://localhost:3000/api/test/start-simulator\n`);
    process.exit(1);
  }
  
  const token = args[0];
  const wsUrl = `ws://127.0.0.1:3000/api/logs/subscribe?token=${token}`;
  
  console.log(`${colors.bright}🔌 Connecting to:${colors.reset} ${colors.dim}${wsUrl}${colors.reset}\n`);
  console.log(`${colors.yellow}⏳ Establishing connection...${colors.reset}\n`);
  
  // Connect to WebSocket
  const ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    console.log(`${colors.green}${colors.bright}✅ Connected successfully!${colors.reset}\n`);
    console.log(`${colors.cyan}📡 Listening for live events...${colors.reset}`);
    console.log(`${colors.dim}Press Ctrl+C to exit${colors.reset}\n`);
  });
  
  ws.on('message', (data) => {
    displayEvent(data.toString());
  });
  
  ws.on('error', (error) => {
    console.log(`\n${colors.red}${colors.bright}❌ WebSocket Error:${colors.reset}`);
    console.log(`${colors.red}${error.message}${colors.reset}\n`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`${colors.yellow}💡 Make sure the backend server is running:${colors.reset}`);
      console.log(`   docker compose up -d\n`);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`\n${colors.yellow}${colors.bright}🔌 Connection closed${colors.reset}`);
    console.log(`${colors.dim}Code: ${code}${colors.reset}`);
    if (reason) {
      console.log(`${colors.dim}Reason: ${reason}${colors.reset}`);
    }
    console.log();
    process.exit(0);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}${colors.bright}👋 Closing connection...${colors.reset}\n`);
    ws.close();
  });
}

// Run the main function
main();
