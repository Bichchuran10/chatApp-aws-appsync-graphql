import "./App.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import React, { useEffect, useState } from "react";
import { API, graphqlOperation, PubSub } from "aws-amplify";
import { messagesByChannelID } from "./graphql/queries";
import { onCreateMessage } from "./graphql/subscriptions";
import { createMessage } from "./graphql/mutations";
import { Auth } from "@aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    Auth.currentUserInfo().then((userInfo) => {
      setUserInfo(userInfo);
    });
  }, []);

  useEffect(() => {
    API.graphql(
      graphqlOperation(messagesByChannelID, {
        channelID: "1",
        sortDirection: "ASC",
      })
    ).then((response) => {
      const items = response?.data?.messagesByChannelID?.items;

      if (items) {
        setMessages(items);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
    ).subscribe({
      next: (event) => {
        setMessages([...messages, event.value.data.onCreateMessage]);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [messages]);

  const handleChange = (event) => {
    setMessageBody(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const input = {
      channelID: "1",
      // author: "Bichchuran",
      author: userInfo.id,
      body: messageBody.trim(),
    };

    try {
      setMessageBody("");
      await API.graphql(graphqlOperation(createMessage, { input }));
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <div className="app">
      {userInfo && (
        <div className="header">
          <div className="profile">
            You are logged in as: <strong>{userInfo.username}</strong>
          </div>
          <Authenticator>
            {({ signOut, user }) => (
              <main>
                {/* <h1>Hello {user.username}</h1> */}
                <button onClick={signOut}>Sign out</button>
              </main>
            )}
          </Authenticator>
        </div>
      )}
      <div className="container">
        <div className="messages">
          <div className="messages-scroller">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.author === userInfo?.id ? "message me" : "message"
                }
              >
                {message.body}
              </div>
            ))}
          </div>
        </div>
        <div className="chat-bar">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="message"
              placeholder="Type your message here..."
              disabled={userInfo === null}
              onChange={handleChange}
              value={messageBody}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default withAuthenticator(App);
