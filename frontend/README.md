# Passing project

## Task for satisfactory grade (3)

Extend the data model with a new entity: tasks.

Each task has a unique `id`, `name`, team assignment (`team_id`), and person responsible (`person_id`), who must be a member of that team. Additionally, it has `start_date` (required when creating the task) and `end_date` (can be null, but cannot be in the future or older than the `start_date`).

An additional navigation menu item, `Tasks`, allows you to manage tasks. Tasks can be created, modified, and deleted, similarly to the `Persons` and `Teams` tabs. Consistency must be ensured, meaning a person's team affiliation cannot be changed if they are responsible for a task assigned to the team. Filtering is implemented as a possibility to select (with a multiple-choice combobox, like in the `person-form`) a team which task is assigned to.

In addition, a Gantt chart of tasks on a timeline should be visible above the task table. This timeline ranges from the oldest start date among the tasks to the present day. Tasks without an end date are displayed up to the right margin of the chart. The colors of the tasks are the same as the colors of the teams to which they are assigned.

## Task for good grade (4)
TBD. The task for satisfactory grade will be a base for it, so implementing the previous task is obligatory.

## Task for very good grade (5)
TBD. The task for satisfactory grade will be also a base for it.

# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
