import tls from 'tls';

/**
 * Sends an email through gmail
 * @param {string} email The gmail address to login to and send from
 * @param {string} password The password to the gmail account
 * @param {string} recipient The email address to receive the email
 * @param {string} subject The subject for the email
 * @param {string} content The text content for the email
 * @todo The double line breaks before the content could be used for HTTP headers or something like that between the two line breaks
 * @returns {Promise<void>}
 */
export default function sendMail({ email, password, recipient, subject, content, log }) {
	// Connects to the gmail server
	const socket = tls.connect({ host: "smtp.gmail.com", port: 465 });
	if (log) socket.on('connect', () => console.log("Socket connected"));

	// Creates all messages to send
	const queue = [
		[ 220, "HELO smtp.gmail.com\r\n" ],
		[ 250, "AUTH LOGIN\r\n" ],
		[ 334, Buffer.from(email).toString('base64') + '\r\n' ],
		[ 334, Buffer.from(password).toString('base64') + "\r\n" ],
		[ 235, `MAIL FROM: <${email}>\r\n` ],
		[ 250, `RCPT TO: <${recipient}>\r\n` ],
		[ 250, "DATA\r\n" ],
		[ 354, `Subject: ${subject}\r\nFrom: <${email}>\r\nTo: <${recipient}>\r\nDate: ${new Date().toString()}\r\n\r\n${content}\r\n.\r\n` ],
		[ 250, "QUIT\r\n" ],
		[ 221, null ]
	];

	// Handles nodejs socket event listener in a promise
	return new Promise((resolve, reject) => {
		// Handles incoming data from gmail server
		socket.on('data', (data) => {
			// Gets response code to compare against and the next command to send
			const next = queue.shift();
			if (log) console.log("Received:", data.toString().trim(), '\n');

			// Compares response code and rejects if matching
			if (!data.toString().startsWith(next[0])) {
				reject(new Error(`Unexpected response: ${data.toString()}`));
				socket.end("QUIT\r\n");
				return;
			}

			// Sends next command if it was not the last
			if (next[1]) {
				if (log) console.log("Sending:", next[1].trim());
				socket.write(next[1]);
				return;
			}

			// Resolves promise after last response code
			resolve();
			socket.end();
		});

		// Handles unexpected socket close
		socket.on('close', () => reject(new Error("Socket connection closed")));
	});
}
