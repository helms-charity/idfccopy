/* eslint-disable */

/* placeholder-script for merge */
$(document).ready(function () {
  var length = $("#gcoverview").data("words") || 150;
  cHtml = sanitize($("#gcoverview").html());
  cText = sanitize($("#gcoverview").text().substr(0, length).trim());
  $("#gcoverview")
    .addClass("compressed")
    .html(cText + "... <a href='#' class='exp'>Read More</a>");
  window.handler = function () {
    $(".exp").click(function () {
      if ($("#gcoverview").hasClass("compressed")) {
        $("#gcoverview").html(
          cHtml + "<a href='#' class='exp'>Read Less</a>"
        );
        $("#gcoverview").removeClass("compressed");
        handler();
        return false;
      } else {
        $("#gcoverview").html(
          cText + "... <a href='#' class='exp'>Read More</a>"
        );
        $("#gcoverview").addClass("compressed");
        handler();
        return false;
      }
    });
  };
  handler();

  
 
});
