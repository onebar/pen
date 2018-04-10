/* global module: false */

module.exports = function(grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      build: {
        src: 'dist/**/*.js',
        dest: 'dist/pen-<%= pkg.version %>.min.js',
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets: ['env'],
      },
      dist: {
        files: [
          {
            expand: true,
            cwd: 'dist/',
            src: ['*.js'],
            dest: 'dist/',
          },
        ],
      },
    },
    concat: {
      options: {
        separator: ';',
      },
      turndown: {
        src: ['node_modules/turndown/dist/turndown.js', 'dist/pen.js'],
        dest: 'dist/pen.js',
      },
    },
    copy: {
      pen: {
        expand: true,
        cwd: 'src',
        filter: 'isFile',
        src: ['**'],
        dest: 'dist/',
      },
    },
  });

  // Plugins
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // Default task(s).
  grunt.registerTask('default', [
    'copy:pen',
    'concat:turndown',
    'babel',
    'uglify',
  ]);
};
