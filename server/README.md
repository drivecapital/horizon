1. On the server, configure a `deploy` user with key-based SSH access and passwordless sudo.
1. Add the server to the inventory file.
1. Set an admin password by following instructions in [`auth.example.yml`](auth.example.yml).
1. Run Ansible:

    ```sh
    $ ansible-playbook -i inventory playbook.yml
    ```

1. Create the admin token and save it somewhere safe:

    ```sh
    # Run from /home/horizon/hacknight
    $ hz make-token admin
    ```

1. Create users:

    ```js
    horizon('users').store({ id: 'username', groups: ['default', 'authenticated'] });
    ```

    ```sh
    $ hz make-token username
    ```
