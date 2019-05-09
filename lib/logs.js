/**
 * A library for storing and rotating logs
 */

 var fs = require('fs');
 var path = require('path');
 var zlib = require('zlib');

 // Container for the module
 var lib = {};

 // Base directory of the logs folder
 lib.baseDir = path.join(__dirname, '/../.logs/');

 // Append a string to a file. Create the file if it does not exist
 lib.append = (file, str, callback) => {
   // Open the file for appending
   fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
     if (!err && fileDescriptor) {
       // Append to the file and close it
       fs.appendFile(fileDescriptor, str + '\n', (err) => {
         if (!err) {
           fs.close(fileDescriptor, (err) => {
             if (!err) {
               callback(false);
             } else {
               callback('Error closing the file that was being appended');
             }
           });
         } else {
           callback('Error appending the file');
         }
       });
     } else {
       callback('Could not open the file for appending');
     }
   });
 };

 // List all the logs and optionally include the compressed logs
 lib.list = (includeCompressedLogs, callback) => {
   fs.readdir(lib.baseDir, (err, data) => {
     if (!err && data && data.length > 0) {
       var trimmedFileNames = [];
       data.ForEach((fileName) => {
         // Add the .log files
         if (fileName.indexOf('.log') > -1) {
           trimmedFileNames.push(fileName.replace('.log', ''));
         }

         // Optionally add the compressed files .gz.b64
         if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
           trimmedFileNames.push(fileName.replace('.gz.b64', ''));
         }
       });
       callback(false, trimmedFileNames);
     } else {
       callback(err, data);
     }
   });
 }

 // Export the module
 module.exports = lib;
