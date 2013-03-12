# grunt-sencha-dependencies [![Build Status](https://api.travis-ci.org/mattgoldspink/grunt-sencha-dependencies.png?branch=master)](https://travis-ci.org/mattgoldspink/grunt-sencha-dependencies)

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

This task tasks a Sencha Touch or Ext.js project and will setup 3 properties with all of the Ext class file dependencies in the correct order for concatenation. The properties generated are:

- `sencha_dependencies_{target}` - All the files your application depends on in the correct dependency order for starting up (including the `ext-debug.js` or `sencha-touch-debug.js` and the file containing your `Ext.application`)
- `sencha_dependencies_{target}_ext_core` - A subset of the above that includes only the files from the core Ext.js or Sencha Touch framework
- `sencha_dependencies_{target}_app` - A subset of `sencha_dependencies_{target}` which includes only the files that are not in `sencha_dependencies_{target}_ext_core`

Where `{target}` is the name of your target in the Grunt configuration. For example if you configuration was:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod:  "."
  }
})
```
Your target is `prod` and hence the properties generaties would be `sencha_dependencies_prod`, `sencha_dependencies_prod_ext_core` and `sencha_dependencies_prod_app`.

### Quick start - if you previously used Sencha Cmd

If you used Sencha Cmd and have an app.json file in your project then all you'll need to configure is the ```src``` property to point to your directory with this in. For example if you're running grunt in the same directory as your app.json it would be:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod:  "."
  }
})
```
If it's in a different directory then change it to point to that. To pass the found files into another task you can do:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod:  "."
  },
  concat: {
    prod: {
      src: '<%= sencha_dependencies_prod %>',
      dest: 'build/app.js',
    }
  }
})
```

Note: You shouldn't need any of the below options unless you have more than 2 files listed in your app.json js property. In which case you will be asked to set the appJs property to name the one which contains you `Ext.application` call.

### Options

These options are typically for people who don't start with an app.json file generated from Sencha Cmd.

#### options.pageRoot
Type: `String`
Default value: current directory

If your index.html is in a different directory to where you are running grunt from then you'll need to set this to be relative to current directory.

#### options.appJs
Type: `String`
Default value: undefined

This should be the string path to your file which contains the `Ext.application` call which initialises your application. This should be set relative to the `pageRoot` property. If you're running this task against a project generated with Sencha Cmd and you have more than 2 files listed in your app.json js property then you should set this value to be the name of the one which contains your `Ext.application`.

#### options.senchaDir
Type: `String`
Default value: undefined

This is the location of the Sencha install. It should be the unzipped install as it comes from Sencha - i.e. don't modify the folder layout in there. This should be set relative to the `pageRoot` property.

#### options.isTouch
Type: `Boolean`
Default value: false

Whether this is a Sencha Touch project or not. When using `phantom` mode (which is the default) you shouldn't need to set this.

#### options.printDepGraph
Type: `Boolean`
Default value: false

If you think things aren't being resolved correctly you can set this to true as the task runs it will print a full depdency graph as it comes across classes. In addition you should use the `--verbose` flag built into grunt which will also show you the files the task found in the order they will be used by the next task.

NOTE: this only works in `dynMock` mode at the moment.

#### options.mode `deprecated`
Type: `String`
Default value: phantom

NOTE: this option will disappear in the next release and only `phantom` will be used.

One of `phantom`, `dynHeadless` or `dynMock` - This tells the task which strategy to use to figure out the dependencies.

- `phantom` - will look for an index.html in the `pageRoot` directory and run that page headlessly in phantomJs. When the page has finished loading it will then look at what files Ext downloaded for the classes. NOTE if other files were downloaded into the page they will not be tracked, only those done through the Ext.Loader are captured.
- `dynHeadless` - will try to run the whole app in a headless browser and intercept the Ext.application.launch call. This is usually the most accurate, but it's also possible that it may break if your code does too much dynamic or depends on some certain browser api's which aren't available. If you find your app doesn't compile correctly in this mode then try `dynMock`
- `dynMock` - will try to run the app.js file but it intercepts all the calls to Ext.js/Sencha Touch class creation and loading api's. This means we don't try to run too many pieces of unnecessary code which could cause breaks.

### Usage Examples for non Sencha Cmd generated apps

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

### Larger examples

Included in the repository is a copy of some of the Ext.js and Sencha Touch examples. All the grunt files in these examples figure out the dependencies, then minify & concat the source using UglifyJS and also generate source-maps which can be used to debug the actual source code files on a minified file. Finally the output is all written to the `dest` folder in that same directory.

- ```tests/integration/pandora-ext-4.1.1a``` - is the Ext 4.1.1a Pandora MVC example, it doesn't not use Sencha Cmd and shows how to configure a build when that has not been used
- ```tests/integration/stockapp-senchatouch-2.1.1``` - A Sencha Touch 2.1.1 example using Touch Charts originally generated using Sencha Cmd and shows how to configure a build with a pre-existing app.json file
- ```tests/integration/touchtweets-2.1.1``` - A Sencha Touch 2.1.1 example using MVC which was originally generated using Sencha Cmd and shows how to configure a build with a pre-existing app.json file

#### When you're running grunt from a different directory to your index.html page

If you have you page(s) in a different directory to where you run grunt then you need to set the `pageRoot` property. For example if your directories are structured like so:

```
app
|-- Gruntfile.js
|-- package.json
+-- www
    |-- index.html
    +-- js
    |    |-- app.js
    |    +-- app
    +-- lib
         +-- sencha-touch-2.1.0
```

Then your config for the grunt task should look like:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod: {
      options: {
        pageRoot: './www', // relative to dir where grunt will be run
        appJs: 'app.js', // relative to www
        senchaDir: 'lib/sencha-touch-2.1.0' // relative to www
      }
    }
  }
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][].

## Release History

- 0.5.2 - Now generate 3 properties of files: sencha_dependencies_{target}, sencha_dependencies_{target}_ext_core and sencha_dependencies_{target}_app
- 0.5.1 - Added support to use app.json from Sencha Cmd to make it easier for existing users to migrate
- 0.5.0 - Switched the default mode to use PhantomJs to capture the loaded classes
- 0.4.0 - Added pageRoot support for when your index.html is not in the root directory
- 0.2.5 - Initial Touch support - tested against the Sencha Stock App - likely still bugs with other apps though
- 0.2.4 - Fixed bugs which prevented it working on the Ext.js Pandora example MVC application and added some new properties to help with debugging
