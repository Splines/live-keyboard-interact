import React, { useState, useEffect } from 'react';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Link from '../src/Link';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import io from 'socket.io-client';
import { Divider, Button } from '@material-ui/core';

// keep in mind: https://rangle.io/blog/simplifying-controlled-inputs-with-hooks/

const About = () => {

  let socket: SocketIOClient.Socket;

  const [messages, setMessages] = useState<string[]>([]);
  const [field, setField] = useState<string>('');

  useEffect(() => {
    // connect to WS server and listen event
    socket = io('https://www.google.com');
    socket.on('message', (msg: string) => addMessage(msg));
  });

  const addMessage = (msg: string) => {
    setMessages(prevMessages => [...prevMessages, msg]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    socket.emit('message', field);
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField(event!.target!.value);
  };

  return (
    <Container maxWidth="sm">
      <Box my={4}>

        <Typography variant="h4" component="h1" gutterBottom>
          About the "Live RegFileViewer"
        </Typography>
        <Link href="/">Back to Home</Link>
        <Typography variant="body1" gutterBottom>
          I'm currently working on this project, so stay tuned in 🥳
        </Typography>

        <Divider style={{ margin: "10px" }} />

        <ul>
          {messages.map((message: string, i: number) => (
            <li key={message + i}>{message}</li>
          ))}
        </ul>
        <form onSubmit={handleSubmit}>
          <input
            onChange={handleChange}
            type="text"
            placeholder="Hello Dominic!">
          </input>
          <Button>Send</Button>
        </form>

      </Box>
    </Container>
  );
};

About.getLayout = getSiteLayout;

export default About;
