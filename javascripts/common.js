document.addEventListener('DOMContentLoaded', function(){
    const node = document.querySelector('[data-md-component="announce"]');
    var banner='';
    banner+='       <aside class="md-banner">';
    banner+='           <div class="md-banner__inner md-grid md-typeset">'
    banner+='               <h1>';
    banner+='                   A new user survey of KServe is available, <a href="https://kserve-survey.com/">Take Survey &gt;&gt;</a>';
    banner+='               </h1>';
    banner+='           </div>';
    banner+='       </aside>';
    node.innerHTML=banner;

});
