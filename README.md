![](https://raw.githubusercontent.com/rethinkdb/horizon/next/github-banner.png)

# Drive Capital Hack Night

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
