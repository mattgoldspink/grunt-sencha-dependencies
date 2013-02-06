# grunt-sencha-dependencies

> A Grunt.js plugin which will figure out the order of Ext classes your Ext.application uses so the list can be passed on to further commands like concat, jshint, etc

## Getting Started

```bash
npm install grunt-sencha-dependencies --save-dev
```

Once that's done, add this line to your project's Gruntfile:

```js
grunt.loadNpmTasks('grunt-sencha-dependencies');
```

If the plugin has been installed correctly, running `grunt --help` at the command line should list the newly-installed plugin's task or tasks. In addition, the plugin should be listed in package.json as a `devDependency`, which ensures that it will be installed whenever the `npm install` command is run.

[grunt]: http://gruntjs.com/
[Getting Started]: https://github.com/gruntjs/grunt/blob/devel/docs/getting_started.md
[package.json]: https://npmjs.org/doc/json.html

## The "sencha_dependencies" task

### Overview
In your project's Gruntfile, add a section named `sencha_dependencies` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  sencha_dependencies: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    }
  }
})
```

See below for the options and examples.

### Options

#### options.appJs
Type: `String`
Default value: undefined

This should be the string path to your file which contains the Ext.application call which initialises your application

#### options.senchaDir
Type: `String`
Default value: undefined

This is the location of the Sencha install. It should be the unzipped install as it comes from Sencha - i.e. don't modify the folder layout in there.

### Usage Examples

#### Basic example
In this example the Ext.application is defined in a file called `app.js` in the `js` folder and the Sencha Ext.js 4.1.2 lib is installed in the directory `js/vendor/extjs-4.1.2`.
The generated array of ordered files will be in a global variable called `sencha_dependencies_prod`

```js
grunt.initConfig({
  sencha_dependencies: {
    prod: {
      options: {
        appJs: './js/app.js',
        senchaDir: './js/vendor/extjs-4.1.2'
      }
    }
  }
})
```

####  How to use this with subsequent steps
You can now use this generated array with other tasks - for example the most common use case is to concatenate these files together in the right order.

Below is the simplest example. Note that you need to use the template syntax '<% %>' because at the time the JavaScript is evaluated in the below config the actual sencha_dependencies task will not have been run.

```js
grunt.initConfig({
  sencha_dependencies: {
    prod: {
      options: {
        appJs: './js/app.js',
        senchaDir: './js/vendor/extjs-4.1.2'
      }
    }
  },
  concat: {
      prod: {
        src: '<%= sencha_dependencies_prod %>',
        dest: 'build/app.js',
      }
    }
});

grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-sencha-dependencies');

grunt.registerTask('prod', ['sencha_dependencies:prod', 'concat:prod']);
```

Or if you wanted to run JSHint on all the files you could do:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod: {
      options: {
        appJs: './js/app.js',
        senchaDir: './js/vendor/extjs-4.1.2'
      }
    }
  },
  jshint: {
    prod: '<%= sencha_dependencies_prod %>'
  }
});

grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-sencha-dependencies');

grunt.registerTask('hint', ['sencha_dependencies:prod', 'jshint:prod']);
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][].

## Release History
_(Nothing yet)_
