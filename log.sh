yesterday=`date +%Y%m%d -d '-1 day'`
mv log/convert.log log/convert.$yesterday.log
kill -USR2 `cat convertor.pid`
