NEW_REMOTE_FILE_NAME=dtu_app.html
NEW_LOCAL_FILE_NAME=dtu_app_local.html

cp app.html $NEW_REMOTE_FILE_NAME

# delete google analytics
sed -i '' '/googletagmanager/,/<\/script>/d' $NEW_REMOTE_FILE_NAME

# delete nav bar
sed -i '' '/navbar-expand-lg/,/<\/nav>/d' $NEW_REMOTE_FILE_NAME

# delete emulator
sed -i '' '/dtu_client_emulator/d' $NEW_REMOTE_FILE_NAME

# delete SDK import
sed -i '' '/customer\/dtu_sdk_js/,/<\/script>/d' $NEW_REMOTE_FILE_NAME

# remove data-dtu attributes
list_of_dtu_attributes=$(cat $NEW_REMOTE_FILE_NAME | gawk 'match($0, /(data-dtu="[a-z0-9A-Z \-\.\:]+")/, arr) { printf "%s\n", arr[0] }')

IFS='
'
for OMG in $list_of_dtu_attributes
do
	sed -Ei '' "s/${OMG}//g" $NEW_REMOTE_FILE_NAME
done

cp $NEW_REMOTE_FILE_NAME $NEW_LOCAL_FILE_NAME

# replace all ="src/ with ="https://dotheyuse.com/src/
sed -i '' 's/href="src/href="https:\/\/dotheyuse.com\/src\/dtu_app\/src/g' $NEW_REMOTE_FILE_NAME
sed -i '' 's/src="src/src="https:\/\/dotheyuse.com\/src\/dtu_app\/src/g' $NEW_REMOTE_FILE_NAME

# replace all ="src/ with ="../../../src/
sed -i '' 's/href="src/href="\.\.\/\.\.\/\.\.\/src/g' $NEW_LOCAL_FILE_NAME
sed -i '' 's/src="src/src="\.\.\/\.\.\/\.\.\/src/g' $NEW_LOCAL_FILE_NAME

mv $NEW_REMOTE_FILE_NAME ./src/customer/demos/
mv $NEW_LOCAL_FILE_NAME ./src/customer/demos/
