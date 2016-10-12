![](https://raw.githubusercontent.com/rethinkdb/horizon/next/github-banner.png)

# Drive Capital Hack Night

## Chat Example

1. Be sure you have [Node.js](https://nodejs.org/en/) installed.

    ```sh
    $ node --version
    ```

    It should be at least version 4.

1. Clone this repository.

    ```sh
    $ git clone https://github.com/drivecapital/horizon.git
    ```

1. Move to the examples directory.

    ```sh
    $ cd horizon/examples
    ```

1. Install the development server.

    ```sh
    $ npm install
    ```

1. Copy `chat/auth.example.js` to a new file named `chat/auth.js` and substitute your auth token from the link in `chat/auth.example.js`.

1. Start the development server from the `examples` directory.

    ```sh
    $ node run.js chat
    ```

1. Open [localhost:8000](http://localhost:8000/) and start chatting!

You can run any of the other examples by repeating steps 5 and 6 above for that example.

## Jeopardy!

Your goal is to build the rest of the `jennings` example, named after Ken Jennings. You should be able to read clues from the `clues` collection, and submit your answers to the `responses` collection.

1. Kill the chat server from before.

1. Add your auth token to the `jennings` example as described before.

1. Start the development server and point it at the `jennings` example.

    ```sh
    $ node run.js jennings
    ```

There's already a skeleton app in the directory. Information on the data you have access to is included in `jennings/app.js`.
