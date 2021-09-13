# Documenting Code

## Words requiring code formatting

Apply code formatting only to special-purpose text:

* Filenames
* Path names
* Fields and values from a YAML file
* Any text that goes into a CLI
* CLI names

## Specify the programming language

> Specify the language your code is in as part of the code block

> Specify non-language specific code, like CLI commands, with ```bash. See the following examples for formatting.

=== ":white_check_mark: Correct"
    ```go
    package main

    import "fmt"

    func main() {
        fmt.Println("hello world")
    }
    ```

=== ":no_entry: Incorrect"
    ```bash
    package main

    import "fmt"

    func main() {
        fmt.Println("hello world")
    }
    ```

=== ":white_check_mark: Correct Formatting"
    ````
    ```go
    package main

    import "fmt"

    func main() {
        fmt.Println("hello world")
    }
    ```
    ````
=== ":no_entry: Incorrect Formatting"
    ````
    ```bash
    package main

    import "fmt"

    func main() {
        fmt.Println("hello world")
    }
    ```
    ````

## Documenting YAML

>When documenting YAML, use two steps. Use step 1 to create the YAML file, and step 2 to apply the YAML file.

>Use **kubectl apply** for files/objects that the user creates: it works for both “create” and “update”, and the source of truth is their local files.

>Use **kubectl edit** for files which are shipped as part of the KServe software, like the KServe ConfigMaps.

> Write ```yaml at the beginning of your code block if you are typing YAML code as part of a CLI command.

=== ":white_check_mark: Correct"

    - Creating or updating a resource:

        1. Create a YAML file using the following template:

            ```yaml
            # YAML FILE CONTENTS
            ```
        2. Apply the YAML file by running the command:

            ```bash
            kubectl apply -f <filename>.yaml
            ```
            Where `<filename>` is the name of the file you created in the previous step.

    - Editing a ConfigMap:

        ```bash
        kubectl -n <namespace> edit configmap <resource-name>
        ```

=== ":no_entry: Incorrect"

    **Example 1:**

    ```yaml
    cat <<EOF | kubectl create -f -
    # code
    EOF
    ```

    **Example 2:**

    ```yaml
    kubectl apply -f - <<EOF
    # code
    EOF
    ```

## Referencing variables in code blocks

>Format variables in code blocks like so: <service-name>

> - All lowercase
- Hyphens between words
- Explanation for each variable below code block
- Explanation format is “Where... `<service-name>` is…"

### Single variable
=== ":white_check_mark: Correct"
    ```bash
    kubectl get isvc <service-name>
    ```
    Where `<service-name>` is the name of your InferenceService.

=== ":no_entry: Incorrect"
    ```bash
    kubectl get isvc {SERVICE_NAME}
    ```
    {SERVICE_NAME} = The name of your service


### Multiple variables

=== ":white_check_mark: Correct"
    ```bash
    kn create service <service-name> --revision-name <revision-name>
    ```
    Where:

    * `<service-name>` is the name of your Knative Service.
    * `<revision-name>` is the desired name of your revision.

=== ":no_entry: Incorrect"
    ```bash
    kn create service <service-name> --revision-name <revision-name>
    ```
    Where `<service-name>` is the name of your Knative Service.<br>
    Where `<revision-name>` is the desired name of your revision.



## CLI output
> CLI Output should include the custom css "{ .bash .no-copy }" in place of "bash" which removes the "Copy to clipboard button" on the right side of the code block
=== ":white_check_mark: Correct"
    ```{ .bash .no-copy }
    <some-code>
    ```

=== ":no_entry: Incorrect"
    ```bash
    <some-code>
    ```

=== ":white_check_mark: Correct Formatting"
    ````
    ```{ .bash .no-copy }
    <some-code>
    ```
    ````
=== ":no_entry: Incorrect Formatting"
    ````
    ```bash
    <some-code>
    ```
    ````

