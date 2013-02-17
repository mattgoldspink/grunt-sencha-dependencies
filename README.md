# grunt-sencha-dependencies [![Build Status](https://api.travis-ci.org/mattgoldspink/grunt-sencha-dependencies.png?branch=master)](https://travis-ci.org/mattgoldspink/grunt-sencha-dependencies)

> A Grunt.js plugin which will figure out the order of Ext classes your Ext.application uses so the list can be passed on to further commands like concat, jshint, etc

## IMPORTANT - This needs Grunt 0.4.0rc7

This plugin was built using the latest grunt because I needed a robust and simple Jasmine task. I'd highly recommend upgrading to Grunt 0.4.0rc7 or later if you've not done so. The instructions to do so can be found on the Grunt wiki: https://github.com/gruntjs/grunt/wiki/Getting-started

In addition, don't get caught out when installing the grunt-contrib-* tasks. These also need
to the be the latest compatible ones that work with 0.4.0rc7. For example I've been using the following:

- npm install grunt-contrib-concat@0.1.2rc6 --save-dev
- npm install grunt-contrib-uglify@0.1.1rc6 --save-dev

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

#### options.pageRoot
Type: `String`
Default value: current directory

If your index.html is in a sub directory then set this to that directory.

#### options.mode
Type: `String`
Default value: dynHeadless

One of `dynHeadless` or `dynMock` - This tells the task which strategy to use to figure out the dependencies.

- `dynHeadless` - will try to run the whole app in a headless browser and intercept the Ext.application.launch call. This is usually the most accurate, but it's also possible that it may break if your code does too much dynamic or depends on some certain browser api's which aren't available. If you find your app doesn't compile correctly in this mode then try `dynMock`
- `dynMock` - will try to run the app.js file but it intercepts all the calls to Ext.js/Sencha Touch class creation and loading api's. This means we don't try to run too many pieces of unnecessary code which could cause breaks.

#### options.isTouch
Type: `Boolean`
Default value: false

Whether this is a Sencha Touch project or not.

#### options.printDepGraph
Type: `Boolean`
Default value: false

If you think things aren't being resolved correctly you can set this to true as the task runs it will print a full depdency graph as it comes across classes. In addition you should use the ```--verbose``` flag built into grunt which will also show you the files the task found in the order they will be used by the next task.

NOTE: this only works in `dynMock` mode at the moment.

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

## Larger example

Included in the repository is a copy of the Ext.js Pandora application which they use to showcase their MVC walkthroughs. This can be found under ```tests/integration/pandora-ext-4.1.1a``` and should be a fully working example.

NOTE: Their example does not manage it's dependencies correctly as it does not declare a few files upfront (notably Ext.container.ButtonGroup). I've left the example broken like this so I can do a "like for like" comparison of the resulting file list. However the build file for the example does copy over the whole of the ext.js lib anway to keep the example working when it is built and minified.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][].

## Release History

- 0.2.5 - Initial Touch support - tested against the Sencha Stock App - likely still bugs with other apps though
- 0.2.4 - Fixed bugs which prevented it working on the Ext.js Pandora example MVC application and added some new properties to help with debugging
