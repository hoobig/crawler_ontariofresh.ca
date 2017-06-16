var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get("/download", function (req, res) {
	var cheerio = require('cheerio');
	var rp = require('request-promise');
	var root_url = 'https://ontariofresh.ca';
	var q = require("q");
	var XLSX = require('xlsx');

	var arr_profile_detail = [];
// get sellers
// var urls = 'https://ontariofresh.ca/directory/sellers';
// var fileName = 'sellers';
// get buyers
// var urls = 'https://ontariofresh.ca/directory/buyers';
// var fileName = 'buyers';

// // get processors
var urls = 'https://ontariofresh.ca/directory/processors';
var fileName = 'processors';

/*Json to XLSX=================================================================================================================*/

/*end json to XLSX*/

function get_all_profile_link(url_page) {
	var arr_profiles = [];
	var deferred = q.defer();
	var options_pro = {
		uri: url_page,
		transform: function (body) {
			return cheerio.load(body);
		}
	};

	rp(options_pro)
	.then(function ($) {
		//get profile link of person
		$('.views-field-business').find('.field-content a').each(function() {
			arr_profiles.push({href: $(this).attr('href'), name: $(this).html()});
		});
		deferred.resolve(arr_profiles);
	})
	.catch(function (err) {
		deferred.reject(new Error(err));
	});
	return deferred.promise;
}

function get_detail_profile(url_detail, nameStore) {
	var deferred = q.defer();
	var options_detail = {
		uri: url_detail,
		transform: function (body) {
			return cheerio.load(body);
		}
	};

	rp(options_detail)
	.then(function ($) {
		//get details profile of person
		var contact_detail = {email: '', web: ''};

		$('.profile_address .col1 .business_contact').find('.label').each(function() {
			if($(this).html() == 'Email:') {
				contact_detail.email = $(this).next('a').attr('title');
			}
			if($(this).html() == 'Web:') {
				contact_detail.web = $(this).next('a').attr('title');
			}
		});

		var obj_details = {
			name: nameStore,
			address: $('.profile_address .col1').clone().children().remove().end().text().trim(),
			phone: $('.profile_address .col1 .business_contact').clone().children().remove().end().text().replace("\n", "").trim(),
			email: contact_detail.email,
			web: contact_detail.web
		}
		deferred.resolve(obj_details);
	})
	.catch(function (err) {
		deferred.reject(new Error(err));
	});
	return deferred.promise;
}

var options = {
	uri: urls,
	transform: function (body) {
		// console.log(body);
		return cheerio.load(body);
	}
};

rp(options)
.then(function ($) {
    // Process html like you would with jQuery... 
    // console.log($.html());


    //get last page
    var link_last_page = $('.pager li').find('.last a').attr('href');
    var last_page = link_last_page.split('=')[1];

    for (var i = 0; i <= last_page; i++) {
    	var url_page = urls;
    	if(i!=0) {
    		url_page = urls+'?page='+i;
    	}
    	get_all_profile_link(url_page).then(function (result) {
    		if(result && result.length > 0) {
    			var profile_length = result.length;
    			for (var k = 0; k < profile_length; k++) {
    				var url_detail = root_url + result[k].href;
    				get_detail_profile(url_detail, result[k].name).then(function (detail) {
    					arr_profile_detail.push(detail);
    				});
    			}
    		}
    	});
    }

    setTimeout(function () {
    	var sheet = XLSX.utils.json_to_sheet(arr_profile_detail);
    	var xlsx_csv = XLSX.utils.sheet_to_csv(sheet);
    	res.setHeader('Content-disposition', 'attachment; filename=lists_'+fileName+'.csv');
    	res.set('Content-Type', 'text/csv');
    	res.status(200).send(xlsx_csv);
    	// console.log(xlsx_file);
    }, 100000);
})
.catch(function (err) {
    // Crawling failed or Cheerio choked... 
});
});

module.exports = router;
