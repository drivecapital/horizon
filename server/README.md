1. On the server, configure a `deploy` user with key-based SSH access and passwordless sudo.
1. Add the server to the inventory file.
1. Set an admin password by following instructions in [`auth.example.yml`](auth.example.yml).
1. Run Ansible:

    ```sh
    $ ansible-playbook -i inventory playbook.yml
    ```

1. Open the server's [admin console](http://localhost:8080/rethinkdb-admin/#dataexplorer) (`http://hostname:port/rethinkdb-admin/`).
1. Set an admin password:

    ```js
    r.db('rethinkdb').table('users').filter({ id: 'admin' }).update({ password: 'myverysecurepassword' })
    ```

1. Create the `hacknight` database:

    ```js
    r.dbCreate('hacknight')
    ```

1. Add tables:

    ```js
    r.db('hacknight').tableCreate('answers')
    r.db('hacknight').tableCreate('messages')
    r.db('hacknight').tableCreate('questions')
    r.db('hacknight').tableCreate('scores')
    ```

1. Add users as necessary:

    ```js
    r.db('rethinkdb').table('users').insert({
        id: 'newusername',
        password: 'newuserpassword'
    })
    r.db('hacknight').grant('newusername', { read: false, write: false, config: false })
    r.db('hacknight').table('answers').grant('newusername', { read: true, write: true })
    r.db('hacknight').table('messages').grant('newusername', { read: true, write: true })
    r.db('hacknight').table('questions').grant('newusername', { read: true })
    r.db('hacknight').table('scores').grant('newusername', { read: true })
    ```
